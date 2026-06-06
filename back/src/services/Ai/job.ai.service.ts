import { llm } from "./core.ai.service";
import { User } from "../../models/user";
import { jobMatchingPromptTemplate } from "./prompts.ai";
import { logTokenUsage } from "../token.service";

export const calculateMatchScore = async (
  jobId: string,
  freelancerId: string
): Promise<{ score: number; reason: string } | null> => {
  let job: any;
  let freelancer: any;

  try {
    // @ts-ignore
    job = await require("../../models/Job").default.findById(jobId).select("title description requiredSkills publisherId");
    freelancer = await User.findById(freelancerId).select("fullName jobTitle bioHeadline aboutMe skills");

    if (!job || !freelancer) {
      console.warn("⚠️ [Job Matching] Job or Freelancer not found");
      return null;
    }

    const jobData = {
      title: job.title,
      description: job.description,
      requiredSkills: job.requiredSkills?.join(", ") || "Not specified"
    };

    const freelancerData = {
      title: freelancer.jobTitle || "Not specified",
      headline: freelancer.bioHeadline || "Not specified",
      about: freelancer.aboutMe || "Not specified",
      skills: freelancer.skills?.join(", ") || "Not specified"
    };

    const formattedPrompt = await jobMatchingPromptTemplate.format({
      jobTitle: jobData.title,
      jobDescription: jobData.description,
      jobSkills: jobData.requiredSkills,
      freelancerTitle: freelancerData.title,
      freelancerBio: freelancerData.about,
      freelancerSkills: freelancerData.skills
    });

    const llmModel = await llm;
    const response: any = await llmModel.invoke(formattedPrompt);
    
    const tokens = response?.response_metadata?.tokenUsage?.totalTokens 
      || response?.usage_metadata?.total_tokens 
      || Math.ceil((response?.content?.length || 0) / 4);

    if (tokens > 0 && job.publisherId) {
      await logTokenUsage(job.publisherId.toString(), 'employerMatching', tokens);
    }
    
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    // Strip markdown code blocks (e.g. ```json ... ```)
    const cleanJsonStr = content.replace(/\`\`\`(?:json)?/g, "").replace(/\`\`\`/g, "").trim();

    const parsed = JSON.parse(cleanJsonStr);

    if (typeof parsed.score === 'number' && typeof parsed.reason === 'string') {
      return {
        score: parsed.score,
        reason: parsed.reason
      };
    }

    throw new Error("Invalid response format from LLM");
  } catch (error: any) {
    console.warn("⚠️ Job Matching LLM call failed, performing local match calculations:", error.message || error);
    
    if (!job || !freelancer) return null;

    // Local fallback logic: match skills intersection
    const jobSkillsList = job.requiredSkills?.map((s: string) => s.toLowerCase().trim()) || [];
    const freelancerSkillsList = freelancer.skills?.map((s: string) => s.toLowerCase().trim()) || [];
    
    const matched = jobSkillsList.filter((s: string) => freelancerSkillsList.includes(s));
    
    let score = 50; // default medium score
    if (jobSkillsList.length > 0) {
      score = Math.round((matched.length / jobSkillsList.length) * 100);
    }

    return {
      score: score,
      reason: `Offline match calculation based on skills intersection. Matched skills: ${matched.join(", ") || "None"}.`
    };
  }
};
import Notification from '../models/Notification';
import Message from '../models/Message';

export const analyzeSignal = (content: string): 'high' | 'low' | 'noise' => {
  const highKeywords = ['deadline', 'important', 'meeting', 'task', 'priority', 'urgent', 'required'];
  const noiseKeywords = ['lol', 'haha', 'gm', 'gn', 'thanks', 'cool', 'nice'];
  
  const contentLower = content.toLowerCase();
  
  if (highKeywords.some(k => contentLower.includes(k))) return 'high';
  if (noiseKeywords.some(k => contentLower.includes(k))) return 'noise';
  return 'low';
};

export const extractTasks = async (message: any) => {
  const taskKeywords = ['todo', 'task', 'remind', 'remember to', 'action item'];
  const contentLower = message.content.toLowerCase();

  if (taskKeywords.some(k => contentLower.includes(k))) {
    // Simulate task extraction
    await Notification.create({
      recipient: message.senderId,
      type: 'aiJobMatches', // Or a more suitable type
      title: 'AI Agent: New Task Extracted',
      body: `I've extracted a task from your chat: "${message.content}"`,
      read: false
    });
  }
};

export const ragQuery = async (groupId: string, question: string) => {
  // Simulate RAG query
  return {
    answer: `Based on the group context for ${groupId}, the answer to "${question}" is that our community values collaboration and Egyptian tech excellence.`,
    sources: [
      { title: 'Community Guidelines', link: '#' },
      { title: 'Recent Announcements', link: '#' }
    ]
  };
};

# 📱 ميزة مزامنة جهات الاتصال والدعوات

## 🎯 الميزات المضافة

### 1. **طلب صلاحية الجهات عند فتح التطبيق لأول مرة** ✨

**الملف**: `src/hooks/useInitialPermissions.ts`

- عند فتح التطبيق لأول مرة، يطلب صلاحية الوصول لجهات الاتصال
- يتم تخزين علم (`contacts_permission_requested`) في AsyncStorage لتجنب إعادة الطلب
- إذا رفض المستخدم، يظهر رسالة توضيح بأهمية الصلاحية

**الكود**:
```typescript
import { useInitialPermissions } from '../src/hooks/useInitialPermissions';

// في _layout.tsx - AuthHydrate component
useInitialPermissions(); // ينفذ تلقائياً عند فتح التطبيق
```

---

### 2. **مزامنة جهات الاتصال من الهاتف** 📞

**الشاشة**: `app/(main)/contacts-sync.tsx`

- يعرض جميع جهات الاتصال على الهاتف
- يتحقق من كل جهة هل هي مسجلة في Rabta أم لا
- يفرز الجهات: المسجلة أولاً، ثم غير المسجلة
- يعرض عداد يوضح عدد الجهات المسجلة

**الأيقونات**:
- ✅ الجهات المسجلة: أيقونة شخص ملونة
- ❌ الجهات غير المسجلة: أيقونة شخص عادية

---

### 3. **إرسال دعوات احترافية** 🚀

**الملف**: `src/utils/inviteUtils.ts`

- رسالة دعوة احترافية وجذابة
- تتضمن وصف التطبيق (LinkedIn meets WhatsApp)
- رابط تحميل مركزي: `https://rabta.app/download`

**مثال الرسالة**:
```
Hey أحمد! 👋

I'm using Rabta - a professional networking app that brings 
together freelancers, employers, and businesses.

Think of it as LinkedIn meets WhatsApp! 💼

Join me here: https://rabta.app/download

Let's connect! 🚀
```

**طرق الإرسال** (عبر Share):
- WhatsApp
- SMS
- Email
- Telegram
- إلخ...

---

### 4. **الواجهة محسّنة** 🎨

**التحسينات**:
- شريط معلومات يعرض عدد الجهات المسجلة
- أزرار مختلفة:
  - **Message** (أزرق): للجهات المسجلة
  - **Invite** (رمادي): للجهات غير المسجلة
- تحميل تلقائي للجهات

---

## 📋 خطوات الاستخدام

### للمستخدم النهائي:

1. **عند فتح التطبيق أول مرة**:
   - يظهر طلب صلاحية الجهات
   - اضغط "Allow"

2. **للوصول لجهات الاتصال**:
   - اذهب إلى "New Contact" أو الشات
   - اضغط "Sync Phone Contacts"

3. **إرسال دعوة**:
   - اضغط "Invite" بجانب الجهة غير المسجلة
   - اختر طريقة الإرسال (WhatsApp, SMS, إلخ)
   - الرسالة تُرسل تلقائياً

---

## 🔧 المتطلبات التقنية

### Packages المطلوبة (موجودة بالفعل):
```json
{
  "expo-contacts": "~56.0.7",
  "@react-native-async-storage/async-storage": "^2.2.0",
  "react-native": "0.85.3"
}
```

### Backend Endpoint المطلوب:
- **POST** `/api/v1/users/sync-contacts`
- يقبل مصفوفة أرقام هاتفية
- يرجع الجهات المسجلة وغير المسجلة

---

## 🔄 Flow الكود

```
App Launch
    ↓
AuthHydrate Loads
    ↓
useInitialPermissions() Runs
    ↓
Requests Contacts Permission (First Time Only)
    ↓
Stored Flag: contacts_permission_requested = true
    ↓
User Can Now Use Contacts Sync Feature
    ↓
When "Sync Contacts" Clicked
    ↓
Read Phone Contacts → Send to Backend → Get Registered List
    ↓
Display Results (Registered vs Unregistered)
    ↓
User Clicks "Invite" → Share Message → Contact Receives Invite
```

---

## 🚀 ملفات معدلة

| الملف | التغيير |
|------|--------|
| `app/_layout.tsx` | إضافة import و call للـ hook |
| `src/hooks/useInitialPermissions.ts` | ملف جديد لطلب الصلاحيات |
| `src/utils/inviteUtils.ts` | ملف جديد لإدارة الدعوات |
| `app/(main)/contacts-sync.tsx` | تحسين الواجهة والرسائل |

---

## 💡 تلميحات للمستقبل

- إضافة SMS direct API (Twilio) لإرسال SMS بدون Share
- تتبع الدعوات المرسلة في قاعدة البيانات
- رابط referral شخصي لكل مستخدم
- إشعارات عند انضمام الجهات المدعوة

---

## ✅ الاختبار

### على جهازك الحقيقي:
1. احذف التطبيق وثبّته من جديد
2. عند الفتح، يظهر طلب الصلاحية
3. اضغط "Allow"
4. اذهب للجهات وحاول الدعوة

### البيانات المخزنة:
- `contacts_permission_requested` في AsyncStorage (لا تُمسح إلا بحذف التطبيق)

---

**تم إضافة الميزة بنجاح! 🎉**

## 🎯 إجراء الاختبار: ميزة الجهات والدعوات

### ✅ ما تم إضافته:

#### 1️⃣ **طلب صلاحية الجهات عند الفتح الأول**
- الملف: `src/hooks/useInitialPermissions.ts`
- المنطق: 
  - عند فتح التطبيق لأول مرة، يطلب صلاحية الوصول للجهات
  - يحفظ علم في AsyncStorage لتجنب إعادة الطلب
  - يعرض رسالة توضيحية إذا رفض المستخدم

#### 2️⃣ **رسائل دعوة احترافية**
- الملف: `src/utils/inviteUtils.ts`
- الرسالة:
  ```
  Hey [Name]! 👋
  I'm using Rabta - a professional networking app...
  [LinkedIn meets WhatsApp concept]
  Join: https://rabta.app/download
  ```

#### 3️⃣ **تحسينات الواجهة**
- شريط معلومات يعرض: "📞 X على Rabta • Y لم يسجلوا"
- أزرار مختلفة للجهات المسجلة (Message) وغير المسجلة (Invite)

---

### 🧪 خطوات الاختبار:

#### **السيناريو 1: الفتح الأول للتطبيق**
```
1. حذف التطبيق بالكامل من الهاتف (Android: Settings > Apps > Uninstall)
2. فتح التطبيق من جديد
3. ✅ يجب أن يظهر طلب: "Allow Rabta to access your contacts?"
4. اختبر "Allow" و "Deny" - كليهما يعمل
5. عند إعادة فتح التطبيق - لا يظهر الطلب مرة أخرى
```

#### **السيناريو 2: عرض الجهات**
```
1. اذهب إلى "New Contact" أو الشات
2. اضغط "Sync Phone Contacts" (الزر الأزرق)
3. ✅ يجب أن يظهر:
   - تحميل: "Syncing your contacts..."
   - شريط معلومات: "📞 3 على Rabta • 5 لم يسجلوا"
   - قائمة الجهات
```

#### **السيناريو 3: إرسال الدعوات**
```
1. من قائمة الجهات، اضغط "Invite" على جهة غير مسجلة
2. ✅ يجب أن يظهر Share Menu:
   - WhatsApp
   - SMS
   - Gmail
   - إلخ...
3. اختر WhatsApp (مثلاً) - الرسالة تُرسل مع الرابط
4. الجهة تستقبل رسالة احترافية مع رابط التحميل
```

---

### 📝 الملفات المعدلة:

| الملف | السطور | التعديل |
|------|--------|---------|
| `app/_layout.tsx` | 35 | إضافة import الـ hook |
| `app/_layout.tsx` | 78 | استدعاء الـ hook في AuthHydrate |
| `src/hooks/useInitialPermissions.ts` | جديد | Hook جديد لطلب الصلاحيات |
| `src/utils/inviteUtils.ts` | جديد | Utility لإدارة الدعوات |
| `app/(main)/contacts-sync.tsx` | 15-45 | تحسين الرسالة والواجهة |

---

### ⚙️ التكوين (اختياري):

**لتحديث رابط التحميل**:
```typescript
// في src/utils/inviteUtils.ts
export const DOWNLOAD_LINK = 'https://rabta.app/download'; // ✏️ عدّل هنا
```

**لتحديث رابط iOS و Android المحدد**:
```typescript
// استخدم src/utils/appStoreLinks.ts
import { APP_STORE_LINKS } from '../utils/appStoreLinks';
// TODO: ضع روابط التطبيق الحقيقية
```

---

### 🔍 التحقق من النجاح:

- [ ] عند الفتح الأول، يظهر طلب الصلاحية
- [ ] الطلب لا يظهر مرة أخرى (حتى مع إعادة فتح التطبيق)
- [ ] يمكن مزامنة الجهات بدون خطأ
- [ ] الجهات المسجلة وغير المسجلة تظهر بشكل صحيح
- [ ] الدعوة تُرسل مع رسالة احترافية

---

### 🚀 الخطوات التالية (للمستقبل):

1. **تحديث رابط التحميل** 
   - iOS: App Store link
   - Android: Google Play Store link

2. **إضافة SMS API** (Twilio)
   - إرسال SMS مباشر بدون Share

3. **تتبع الدعوات**
   - حفظ في قاعدة البيانات
   - معرفة من تم إرسال دعوة له

4. **Referral Links**
   - رابط شخصي لكل مستخدم
   - مكافآت عند تسجيل صديق

---

**تم بنجاح! 🎉**

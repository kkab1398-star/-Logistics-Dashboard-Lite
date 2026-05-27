import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "en" | "ar" | "ur";

type Translations = Record<string, { en: string; ar: string; ur: string }>;

export const dictionary: Translations = {
  // App
  appName: { en: "Al-Shalal", ar: "الشلال", ur: "الشلال" },
  invoiceHeader: { en: "Khamis Mushait - Military City Road", ar: "خميس مشيط - طريق المدينة العسكرية", ur: "خمیس مشیط - ملٹری سٹی روڈ" },
  // Nav
  dashboard: { en: "Dashboard", ar: "لوحة التحكم", ur: "ڈیش بورڈ" },
  expenses: { en: "Expenses", ar: "المصروفات", ur: "اخراجات" },
  revenues: { en: "Revenue", ar: "الإيرادات", ur: "آمدنی" },
  transfers: { en: "Owner Transfer", ar: "تحويل المالك", ur: "مالک ٹرانسفر" },
  drivers: { en: "Drivers", ar: "السائقين", ur: "ڈرائیورز" },
  adminDashboard: { en: "Admin Dashboard", ar: "لوحة الإدارة", ur: "ایڈمن ڈیش بورڈ" },
  globalAnalytics: { en: "Global Analytics", ar: "التحليلات العامة", ur: "عمومی تجزیات" },
  settlements: { en: "Settlements", ar: "التسويات", ur: "تصفیے" },
  settings: { en: "Settings", ar: "الإعدادات", ur: "ترتیبات" },
  invoice: { en: "Invoice", ar: "فاتورة", ur: "انوائس" },
  archive: { en: "Archive", ar: "الأرشيف", ur: "آرکائیو" },
  // Actions
  addExpense: { en: "Add Expense", ar: "إضافة مصروف", ur: "خرچہ شامل کریں" },
  addDriver: { en: "Add Driver", ar: "إضافة سائق", ur: "ڈرائیور شامل کریں" },
  addRevenue: { en: "Add Revenue", ar: "إضافة إيراد", ur: "آمدنی شامل کریں" },
  addTransfer: { en: "Add Transfer", ar: "إضافة تحويل", ur: "ٹرانسفر شامل کریں" },
  save: { en: "Save", ar: "حفظ", ur: "محفوظ کریں" },
  confirm: { en: "Confirm", ar: "تأكيد", ur: "تصدیق کریں" },
  cancel: { en: "Cancel", ar: "إلغاء", ur: "منسوخ کریں" },
  logout: { en: "Logout", ar: "تسجيل الخروج", ur: "لاگ آؤٹ" },
  print: { en: "Print", ar: "طباعة", ur: "پرنٹ" },
  shareWhatsApp: { en: "Share via WhatsApp", ar: "مشاركة عبر واتساب", ur: "واٹس ایپ سے شیئر کریں" },
  notifyOwner: { en: "Notify Owner", ar: "إخطار المالك", ur: "مالک کو اطلاع دیں" },
  generateInvoice: { en: "Generate Invoice", ar: "إنشاء فاتورة", ur: "انوائس بنائیں" },
  createInvoice: { en: "New Invoice", ar: "فاتورة جديدة", ur: "نئی انوائس" },
  // Fields
  total: { en: "Total", ar: "الإجمالي", ur: "کل" },
  liters: { en: "Liters", ar: "لتر", ur: "لیٹر" },
  sar: { en: "SAR", ar: "ريال", ur: "ریال" },
  date: { en: "D/M/Y", ar: "ي/ش/س", ur: "D/M/Y" },
  notes: { en: "Notes", ar: "ملاحظات", ur: "نوٹس" },
  description: { en: "Description", ar: "الوصف", ur: "تفصیل" },
  uploadInvoice: { en: "Upload Receipt", ar: "رفع الفاتورة", ur: "رسید اپ لوڈ کریں" },
  driverName: { en: "Driver Name", ar: "اسم السائق", ur: "ڈرائیور کا نام" },
  vehicleNumber: { en: "Vehicle Number", ar: "رقم المركبة", ur: "گاڑی نمبر" },
  phone: { en: "Phone Number", ar: "رقم الهاتف", ur: "فون نمبر" },
  email: { en: "Email", ar: "البريد الإلكتروني", ur: "ای میل" },
  amount: { en: "Amount", ar: "المبلغ", ur: "رقم" },
  calculatedLiters: { en: "Calculated Liters", ar: "اللترات المحسوبة", ur: "حسابی لیٹر" },
  clientName: { en: "Client Name", ar: "اسم العميل", ur: "کلائنٹ کا نام" },
  serviceType: { en: "Service Type", ar: "نوع الخدمة", ur: "سروس کی قسم" },
  invoiceNumber: { en: "Invoice #", ar: "رقم الفاتورة", ur: "انوائس نمبر" },
  vatZero: { en: "VAT: 0% (Exempt)", ar: "ضريبة القيمة المضافة: 0% (معفى)", ur: "VAT: 0% (مستثنیٰ)" },
  ownerWhatsApp: { en: "Owner WhatsApp", ar: "واتساب المالك", ur: "مالک کا واٹس ایپ" },
  businessPhone: { en: "Business Phone", ar: "هاتف الشركة", ur: "کاروباری فون" },
  businessEmail: { en: "Business Email", ar: "بريد الشركة", ur: "کاروباری ای میل" },
  ownerWhatsAppHint: { en: "e.g. +966501234567", ar: "مثال: +966501234567", ur: "مثال: +966501234567" },
  settingsSaved: { en: "Settings saved", ar: "تم حفظ الإعدادات", ur: "ترتیبات محفوظ ہو گئیں" },
  // Expense types
  selectDriver: { en: "Select Driver", ar: "اختر السائق", ur: "ڈرائیور منتخب کریں" },
  expenseType: { en: "Expense Type", ar: "نوع المصروف", ur: "خرچے کی قسم" },
  diesel: { en: "Diesel", ar: "ديزل", ur: "ڈیزل" },
  oil: { en: "Oil", ar: "زيت", ur: "تیل" },
  maintenance: { en: "Maintenance", ar: "صيانة", ur: "دیکھ بھال" },
  other: { en: "Other", ar: "أخرى", ur: "دیگر" },
  // Dashboard
  recentExpenses: { en: "Recent Expenses", ar: "المصروفات الأخيرة", ur: "حالیہ اخراجات" },
  expenseSummary: { en: "Expense Summary", ar: "ملخص المصروفات", ur: "اخراجات کا خلاصہ" },
  noExpenses: { en: "No expenses found", ar: "لا توجد مصروفات", ur: "کوئی اخراجات نہیں ملے" },
  noRevenues: { en: "No revenue entries", ar: "لا توجد إيرادات", ur: "کوئی آمدنی نہیں" },
  noTransfers: { en: "No transfers found", ar: "لا توجد تحويلات", ur: "کوئی ٹرانسفر نہیں ملا" },
  all: { en: "All", ar: "الكل", ur: "تمام" },
  createDriver: { en: "Create Driver", ar: "إنشاء سائق", ur: "ڈرائیور بنائیں" },
  // Settlement
  settle: { en: "Settle Cycle", ar: "تسوية الدورة", ur: "سائیکل تصفیہ" },
  settlementSummary: { en: "Settlement Summary", ar: "ملخص التسوية", ur: "تصفیے کا خلاصہ" },
  confirmSettlement: { en: "Confirm Settlement", ar: "تأكيد التسوية", ur: "تصفیہ کی تصدیق کریں" },
  settlementConfirmed: { en: "Cycle settled & archived", ar: "تمت التسوية وأُرشفت الدورة", ur: "سائیکل طے اور محفوظ ہو گیا" },
  adminOnlySettle: { en: "Only admin can close a financial cycle", ar: "يمكن للمدير فقط إغلاق الدورة المالية", ur: "صرف ایڈمن مالی سائیکل بند کر سکتا ہے" },
  netProfit: { en: "Net Profit", ar: "صافي الربح", ur: "خالص منافع" },
  driverShare: { en: "Driver Share (50%)", ar: "حصة السائق (50%)", ur: "ڈرائیور حصہ (50%)" },
  ownerPayout: { en: "Owner Payout", ar: "مستحقات المالك", ur: "مالک کی ادائیگی" },
  totalRevenue: { en: "Total Revenue", ar: "إجمالي الإيرادات", ur: "کل آمدنی" },
  totalExpenses: { en: "Total Expenses", ar: "إجمالي المصروفات", ur: "کل اخراجات" },
  totalTransfers: { en: "Total Transfers", ar: "إجمالي التحويلات", ur: "کل ٹرانسفر" },
  currentCycle: { en: "Current Cycle", ar: "الدورة الحالية", ur: "موجودہ سائیکل" },
  pastSettlements: { en: "Past Settlements", ar: "التسويات السابقة", ur: "پچھلے تصفیے" },
  noSettlements: { en: "No settlements yet", ar: "لا توجد تسويات بعد", ur: "ابھی تک کوئی تصفیہ نہیں" },
  expenseCount: { en: "Expenses", ar: "المصروفات", ur: "اخراجات" },
  revenueCount: { en: "Revenues", ar: "الإيرادات", ur: "آمدنیاں" },
  transferCount: { en: "Transfers", ar: "التحويلات", ur: "ٹرانسفر" },
  period: { en: "Period", ar: "الفترة", ur: "مدت" },
  settlementHistory: { en: "Settlement History", ar: "سجل التسويات", ur: "تصفیے کی تاریخ" },
  profitShared: { en: "Profit Shared", ar: "الربح المشترك", ur: "مشترک منافع" },
  // Deferred payment / postponed amounts
  deferredPayment: { en: "Deferred Payment", ar: "دفع مؤجل", ur: "مؤخر ادائیگی" },
  deferredPaymentHint: { en: "Client owes this amount — not yet received", ar: "العميل مدين بهذا المبلغ — لم يُستلم بعد", ur: "کلائنٹ نے یہ رقم ادا نہیں کی — ابھی موصول نہیں" },
  postponedAmounts: { en: "Postponed Amounts", ar: "المبالغ المؤجلة", ur: "مؤخر کردہ رقوم" },
  postponedDesc: { en: "Unpaid deferred revenue", ar: "إيرادات مؤجلة لم تُدفع", ur: "غیر ادا شدہ مؤخر آمدنی" },
  deferred: { en: "Deferred", ar: "مؤجل", ur: "مؤخر" },
  markAsPaid: { en: "Mark as Paid", ar: "تم الدفع", ur: "ادا شدہ نشان زد کریں" },
  markedAsPaid: { en: "Payment received & recorded", ar: "تم استلام الدفعة وتسجيلها", ur: "ادائیگی موصول اور درج" },
  settleWithDeferredWarning: { en: "Warning: There are unpaid deferred amounts that must be settled.", ar: "تنبيه: توجد مبالغ مؤجلة لم يتم دفعها بعد.", ur: "تنبیہ: کچھ مؤخر رقوم ابھی ادا نہیں ہوئیں۔" },
  settleDeferredCount: { en: "{count} unpaid deferred entries totaling {total} SAR", ar: "{count} إيراد مؤجل غير مدفوع بإجمالي {total} ريال", ur: "{count} غیر ادا مؤخر اندراج، کل {total} ریال" },
  settlementBlocked: { en: "Settlement Blocked", ar: "تسوية معطلة", ur: "تصفیہ مسدود" },
  settlementCannotProceed: { en: "Cannot settle with outstanding deferred amounts.", ar: "لا يمكن تنفيذ التسوية مع مبالغ مؤجلة عالقة.", ur: "عالق مؤخر رقوم کے ساتھ تصفیہ نہیں ہو سکتی۔" },
  deficitWarning: { en: "Deferred Deficit — Cash is lower than Gross", ar: "عجز مؤجل — النقدية أقل من الإجمالي", ur: "مؤخر خسارہ — کیش مجموع سے کم ہے" },
  grossRevenue: { en: "Gross Revenue", ar: "إجمالي الإيرادات", ur: "کل مجموعی آمدنی" },
  cashRevenue: { en: "Cash Revenue", ar: "إيرادات نقدية", ur: "کیش آمدنی" },
  allEntries: { en: "All entries", ar: "جميع السجلات", ur: "تمام اندراجات" },
  paid: { en: "Paid", ar: "مدفوع", ur: "ادا شدہ" },
  // Auth
  selectRole: { en: "Welcome to Al-Shalal", ar: "مرحباً بك في الشلال", ur: "الشلال میں خوش آمدید" },
  imAdmin: { en: "Admin Access", ar: "دخول المدير", ur: "ایڈمن رسائی" },
  imDriver: { en: "I am a Driver", ar: "أنا سائق", ur: "میں ڈرائیور ہوں" },
  enterAdminCode: { en: "Enter admin code", ar: "أدخل رمز الإدارة", ur: "ایڈمن کوڈ درج کریں" },
  wrongCode: { en: "Incorrect code", ar: "رمز غير صحيح", ur: "غلط کوڈ" },
  selectYourProfile: { en: "Select your profile", ar: "اختر ملفك الشخصي", ur: "اپنا پروفائل منتخب کریں" },
  loginWithCredentials: { en: "Login with username & password", ar: "تسجيل بالاسم وكلمة المرور", ur: "صارف نام اور پاس ورڈ سے لاگ ان کریں" },
  username: { en: "Username", ar: "اسم المستخدم", ur: "صارف نام" },
  password: { en: "Password", ar: "كلمة المرور", ur: "پاس ورڈ" },
  loginFailed: { en: "Incorrect username or password", ar: "اسم المستخدم أو كلمة المرور غير صحيحة", ur: "غلط صارف نام یا پاس ورڈ" },
  accountFrozen: { en: "This account is frozen. Contact admin.", ar: "هذا الحساب مجمد. تواصل مع المدير.", ur: "یہ اکاؤنٹ منجمد ہے۔ ایڈمن سے رابطہ کریں۔" },
  // Driver management
  editDriver: { en: "Edit Driver", ar: "تعديل السائق", ur: "ڈرائیور ترمیم کریں" },
  deleteDriver: { en: "Delete Driver", ar: "حذف السائق", ur: "ڈرائیور حذف کریں" },
  freezeDriver: { en: "Freeze Account", ar: "تجميد الحساب", ur: "اکاؤنٹ منجمد کریں" },
  unfreezeDriver: { en: "Unfreeze Account", ar: "إلغاء التجميد", ur: "اکاؤنٹ بحال کریں" },
  confirmDelete: { en: "Confirm Delete", ar: "تأكيد الحذف", ur: "حذف کی تصدیق کریں" },
  confirmDeleteMsg: { en: "This will permanently delete the driver and all their data.", ar: "سيؤدي هذا إلى حذف السائق وجميع بياناته نهائياً.", ur: "یہ ڈرائیور اور ان کا تمام ڈیٹا مستقل طور پر حذف کر دے گا۔" },
  driverUpdated: { en: "Driver updated successfully", ar: "تم تحديث السائق بنجاح", ur: "ڈرائیور کامیابی سے اپ ڈیٹ ہو گیا" },
  driverDeleted: { en: "Driver deleted", ar: "تم حذف السائق", ur: "ڈرائیور حذف ہو گیا" },
  driverFrozen: { en: "Account frozen", ar: "تم تجميد الحساب", ur: "اکاؤنٹ منجمد ہو گیا" },
  driverUnfrozen: { en: "Account unfrozen", ar: "تم إلغاء التجميد", ur: "اکاؤنٹ بحال ہو گیا" },
  frozen: { en: "Frozen", ar: "مجمد", ur: "منجمد" },
  active: { en: "Active", ar: "نشط", ur: "فعال" },
  newPassword: { en: "New Password (leave blank to keep)", ar: "كلمة مرور جديدة (اتركها فارغة للإبقاء)", ur: "نیا پاس ورڈ (خالی چھوڑیں)" },
  usernameConflict: { en: "Username already taken", ar: "اسم المستخدم مستخدم مسبقاً", ur: "یہ صارف نام پہلے سے موجود ہے" },
  driverCreated: { en: "Driver account created and activated successfully", ar: "تم إنشاء حساب السائق وتفعيل بيانات الدخول بنجاح", ur: "ڈرائیور اکاؤنٹ کامیابی سے بنایا اور چالو کیا گیا" },
  accessDenied: { en: "Access Denied", ar: "وصول مرفوض", ur: "رسائی ممنوع" },
  // Invoice services
  serviceLoadUnload: { en: "Loading & Unloading", ar: "تحميل وتنزيل", ur: "لوڈنگ اور اتارنا" },
  serviceWarehouseArrangement: { en: "Warehouse Arrangement", ar: "ترتيب مستودع", ur: "گودام ترتیب" },
  serviceWarehouseTransport: { en: "Warehouse Transport", ar: "نقل مستودع", ur: "گودام منتقلی" },
  serviceDailyRate: { en: "Daily Rate", ar: "يومية", ur: "روزانہ" },
  serviceOther: { en: "Other", ar: "أخرى", ur: "دیگر" },
  // Operations monitor
  masterDashboard: { en: "Master Operations Monitor", ar: "مراقبة العمليات المركزية", ur: "مرکزی آپریشنز مانیٹر" },
  liveUpdates: { en: "Live — updates every 10s", ar: "مباشر — يتحدث كل ١٠ ث", ur: "براہ راست — ہر ١٠ سیکنڈ" },
  noData: { en: "No data for this period", ar: "لا توجد بيانات لهذه الفترة", ur: "اس دور کے لیے کوئی ڈیٹا نہیں" },
  netShare: { en: "Net / Share", ar: "الصافي / الحصة", ur: "خالص / حصہ" },
  // Admin reset
  hardReset: { en: "System Hard Reset", ar: "إعادة ضبط النظام بالكامل", ur: "مکمل سسٹم ری سیٹ" },
  hardResetDesc: { en: "Permanently erase ALL data including revenues, expenses, transfers, settlements, and all driver accounts.", ar: "سيتم مسح كافة البيانات بما في ذلك حسابات السائقين نهائياً.", ur: "تمام ڈیٹا بشمول ڈرائیور اکاؤنٹس مستقل طور پر حذف ہو جائے گا۔" },
  hardResetWarning: { en: "Are you sure? ALL data including driver accounts will be permanently deleted! Only the admin can log in afterward.", ar: "هل أنت متأكد؟ سيتم مسح كافة البيانات بما في ذلك حسابات السائقين نهائياً! يمكن للمدير فقط تسجيل الدخول بعد ذلك.", ur: "کیا آپ یقین رکھتے ہیں؟ تمام ڈیٹا بشمول ڈرائیور اکاؤنٹس مستقل طور پر حذف ہو جائے گا!" },
  hardResetConfirm: { en: "Yes, Reset Everything", ar: "نعم، إعادة الضبط الكاملة", ur: "ہاں، سب کچھ ری سیٹ کریں" },
  hardResetSuccess: { en: "System has been reset successfully.", ar: "تم إعادة ضبط النظام بنجاح.", ur: "سسٹم کامیابی سے ری سیٹ ہو گیا۔" },
  hardResetError: { en: "Reset failed. Please try again.", ar: "فشلت عملية الإعادة. حاول مرة أخرى.", ur: "ری سیٹ ناکام ہو گئی۔ دوبارہ کوشش کریں۔" },
  dangerZone: { en: "Danger Zone", ar: "منطقة الخطر", ur: "خطرناک علاقہ" },
  // Analytics
  driverCount: { en: "Total Drivers", ar: "إجمالي السائقين", ur: "کل ڈرائیور" },
  settlementCount: { en: "Settlements", ar: "التسويات", ur: "تصفیے" },
  perDriver: { en: "Per Driver", ar: "لكل سائق", ur: "فی ڈرائیور" },
  dateRange: { en: "Date Range", ar: "نطاق التاريخ", ur: "تاریخ کی حد" },
  from: { en: "From (D/M/Y)", ar: "من (ي/ش/س)", ur: "سے (D/M/Y)" },
  to: { en: "To (D/M/Y)", ar: "إلى (ي/ش/س)", ur: "تک (D/M/Y)" },
  filter: { en: "Filter", ar: "تصفية", ur: "فلٹر" },
  // Instant Activity
  instantActivity: { en: "Instant Activity", ar: "النشاط اللحظي", ur: "فوری سرگرمی" },
  instantActivityDesc: { en: "Live operations for this driver", ar: "عمليات هذا السائق مباشرةً", ur: "اس ڈرائیور کی لائیو سرگرمیاں" },
  todayActivity: { en: "Today's Activity", ar: "نشاط اليوم", ur: "آج کی سرگرمی" },
  totalDailyRevenue: { en: "Total Revenue", ar: "إجمالي الإيرادات", ur: "کل آمدنی" },
  totalDailyExpenses: { en: "Total Expenses", ar: "إجمالي المصروفات", ur: "کل اخراجات" },
  ownerTransfers: { en: "Owner Transfers", ar: "تحويلات المالك", ur: "مالک کی منتقلی" },
  netAmount: { en: "Net", ar: "الصافي", ur: "خالص" },
  noActivityFound: { en: "No activity in this period", ar: "لا توجد عمليات في هذه الفترة", ur: "اس عرصے میں کوئی سرگرمی نہیں" },
  deleteExpense: { en: "Delete", ar: "حذف", ur: "حذف کریں" },
  expenseDeleted: { en: "Expense deleted", ar: "تم حذف المصروف", ur: "خرچ حذف ہو گیا" },
  transferDeleted: { en: "Transfer deleted", ar: "تم حذف التحويل", ur: "منتقلی حذف ہو گئی" },
  adminDeleteEntry: { en: "Delete entry", ar: "حذف السجل", ur: "اندراج حذف کریں" },
  adminDeleteConfirm: { en: "Delete this entry?", ar: "حذف هذا السجل؟", ur: "یہ اندراج حذف کریں؟" },
  adminEntryDeleted: { en: "Entry deleted", ar: "تم حذف السجل", ur: "اندراج حذف ہو گیا" },
  adminDeleteFailed: { en: "Delete failed. It may be settled.", ar: "فشل الحذف. قد يكون السجل مُسوَّى.", ur: "حذف ناکام۔ ممکن ہے یہ طے شدہ ہے۔" },
  // Invoice saving
  saveInvoice: { en: "Save Invoice", ar: "حفظ الفاتورة", ur: "فاتورہ محفوظ کریں" },
  saving: { en: "Saving...", ar: "جارٍ الحفظ...", ur: "محفوظ ہو رہا ہے..." },
  generating: { en: "Generating...", ar: "جارٍ الإنشاء...", ur: "بن رہا ہے..." },
  invoiceSaved: { en: "Invoice saved successfully!", ar: "تم حفظ الفاتورة بنجاح!", ur: "فاتورہ کامیابی سے محفوظ ہو گئی!" },
  invoiceCreated: { en: "Invoice created successfully", ar: "تم إنشاء الفاتورة بنجاح", ur: "فاتورہ کامیابی سے بن گیا" },
  errorSelectServiceType: { en: "Please select a service type", ar: "يرجى اختيار نوع الخدمة", ur: "براہ کرم خدمت کی قسم منتخب کریں" },
  errorEnterAmount: { en: "Please enter a valid amount", ar: "يرجى إدخال مبلغ صحيح", ur: "براہ کرم درست رقم درج کریں" },
  printPdf: { en: "Print / Download PDF", ar: "طباعة / تنزيل PDF", ur: "پرنٹ / PDF ڈاؤن لوڈ" },
  viewSavedInvoice: { en: "View Saved Invoice", ar: "عرض الفاتورة المحفوظة", ur: "محفوظ فاتورہ دیکھیں" },
  invoiceLinked: { en: "Invoice Saved", ar: "فاتورة محفوظة", ur: "فاتورہ محفوظ" },
  createInvoiceFor: { en: "Create Invoice", ar: "إنشاء فاتورة", ur: "فاتورہ بنائیں" },
  // Statistics module
  statistics: { en: "Statistics", ar: "الإحصائية", ur: "اعداد و شمار" },
  totalIncome: { en: "Total Income", ar: "إجمالي الدخل", ur: "کل آمدنی" },
  ownerWithdrawals: { en: "Owner Withdrawals", ar: "مسحوبات المالك", ur: "مالک کی نکاسی" },
  exportData: { en: "Export", ar: "تصدير", ur: "برآمد" },
  exportCsv: { en: "Export CSV", ar: "تصدير CSV", ur: "CSV برآمد" },
  generalAnalytics: { en: "General Analytics", ar: "التحليلات العامة", ur: "عمومی تجزیہ" },
  driverAnalytics: { en: "Driver Analytics", ar: "تحليلات السائق", ur: "ڈرائیور تجزیہ" },
  activityTrend: { en: "Activity Trend", ar: "اتجاه النشاط", ur: "سرگرمی کا رجحان" },
  revenueVsExpenses: { en: "Revenue vs Expenses", ar: "الإيرادات مقابل المصروفات", ur: "آمدنی بمقابلہ اخراجات" },
  monthlyBreakdown: { en: "Monthly Breakdown", ar: "التفصيل الشهري", ur: "ماہانہ تفصیل" },
  noChartData: { en: "No data available for charts", ar: "لا توجد بيانات للرسوم البيانية", ur: "چارٹ کے لیے کوئی ڈیٹا نہیں" },
  exportOperations: { en: "Export Operations", ar: "تصدير العمليات", ur: "عملیات برآمد کریں" },
  operationDetail: { en: "Detailed Report", ar: "التقرير التفصيلي", ur: "تفصیلی رپورٹ" },
  // Activity feed
  recentActivity: { en: "Recent Activity", ar: "النشاط الأخير", ur: "حالیہ سرگرمی" },
  noActivity: { en: "No activity yet — add revenue, expense or transfer", ar: "لا يوجد نشاط بعد — أضف إيراداً أو مصروفاً أو تحويلاً", ur: "ابھی کوئی سرگرمی نہیں — آمدنی، خرچہ یا ٹرانسفر شامل کریں" },
  // Revenue list & print
  revenueList: { en: "Revenue History", ar: "سجل الإيرادات", ur: "آمدنی کی تاریخ" },
  editRevenue: { en: "Edit Entry", ar: "تعديل السجل", ur: "اندراج ترمیم کریں" },
  revenueUpdated: { en: "Revenue updated successfully", ar: "تم تحديث الإيراد بنجاح", ur: "آمدنی کامیابی سے اپ ڈیٹ ہو گئی" },
  deleteRevenue: { en: "Delete", ar: "حذف", ur: "حذف کریں" },
  revenueDeleted: { en: "Revenue deleted", ar: "تم حذف الإيراد", ur: "آمدنی حذف ہو گئی" },
  editExpense: { en: "Edit Entry", ar: "تعديل السجل", ur: "اندراج ترمیم کریں" },
  expenseUpdated: { en: "Expense updated successfully", ar: "تم تحديث المصروف بنجاح", ur: "خرچہ کامیابی سے اپ ڈیٹ ہو گیا" },
  printInvoice: { en: "Print Invoice", ar: "طباعة الفاتورة", ur: "انوائس پرنٹ کریں" },
  downloadPdf: { en: "Download PDF", ar: "تحميل PDF", ur: "PDF ڈاؤن لوڈ کریں" },
  customerName: { en: "Customer Name", ar: "اسم العميل", ur: "کسٹمر کا نام" },
  customerNameHint: { en: "Type to search past customers…", ar: "اكتب للبحث عن العملاء السابقين…", ur: "پچھلے کسٹمرز تلاش کریں…" },
  currentCycleOnly: { en: "Current cycle only", ar: "الدورة الحالية فقط", ur: "صرف موجودہ سائیکل" },
  allTime: { en: "All-time", ar: "كل الوقت", ur: "تمام وقت" },
  settled: { en: "Settled", ar: "مُسوَّى", ur: "طے شدہ" },
  allDrivers: { en: "All Drivers", ar: "جميع السائقين", ur: "تمام ڈرائیور" },
  allMonths: { en: "All Months", ar: "جميع الأشهر", ur: "تمام مہینے" },
  filterByClient: { en: "Search by client…", ar: "بحث باسم العميل…", ur: "کلائنٹ کے نام سے تلاش کریں…" },
  filterByExpense: { en: "Search by type or notes…", ar: "بحث بالنوع أو الملاحظات…", ur: "قسم یا نوٹس سے تلاش کریں…" },
  filteredSummary: { en: "Filtered Summary", ar: "ملخص النتائج المصفاة", ur: "فلٹر شدہ خلاصہ" },
  totalEntries: { en: "Entries", ar: "السجلات", ur: "اندراجات" },
  showRevenueDetails: { en: "Show revenue details", ar: "عرض تفاصيل الإيرادات", ur: "آمدنی کی تفصیل دکھائیں" },
  hideRevenueDetails: { en: "Hide revenue details", ar: "إخفاء تفاصيل الإيرادات", ur: "آمدنی کی تفصیل چھپائیں" },
  noClient: { en: "No client", ar: "بلا عميل", ur: "کوئی کلائنٹ نہیں" },
  matched: { en: "match", ar: "مطابق", ur: "مل گیا" },
  noCurrentCycleRevenue: { en: "No revenue in current cycle yet", ar: "لا توجد إيرادات في الدورة الحالية", ur: "موجودہ سائیکل میں ابھی کوئی آمدنی نہیں" },
  noCurrentCycleExpenses: { en: "No expenses in current cycle yet", ar: "لا توجد مصروفات في الدورة الحالية", ur: "موجودہ سائیکل میں ابھی کوئی خرچہ نہیں" },
  noCurrentCycleTransfers: { en: "No transfers in current cycle yet", ar: "لا توجد تحويلات في الدورة الحالية", ur: "موجودہ سائیکل میں ابھی کوئی ٹرانسفر نہیں" },
  transferList: { en: "Transfer History", ar: "سجل التحويلات", ur: "ٹرانسفر کی تاریخ" },
  // Diesel summary (driver expenses)
  dieselSummary: { en: "Diesel This Cycle", ar: "الديزل في هذه الدورة", ur: "اس سائیکل میں ڈیزل" },
  totalLiters: { en: "Total Liters", ar: "إجمالي اللترات", ur: "کل لیٹر" },
  totalDieselCost: { en: "Total Cost", ar: "التكلفة الإجمالية", ur: "کل لاگت" },
  dieselEntries: { en: "Fill-ups", ar: "عمليات التعبئة", ur: "بھراؤ" },
  noDieselThisCycle: { en: "No diesel entries in current cycle yet", ar: "لا توجد إدخالات ديزل في الدورة الحالية بعد", ur: "موجودہ سائیکل میں ابھی کوئی ڈیزل اندراج نہیں" },
  editTransfer: { en: "Edit Entry", ar: "تعديل السجل", ur: "اندراج ترمیم کریں" },
  transferUpdated: { en: "Transfer updated successfully", ar: "تم تحديث التحويل بنجاح", ur: "ٹرانسفر کامیابی سے اپ ڈیٹ ہو گیا" },
  transferSettledError: { en: "Cannot edit a settled transfer", ar: "لا يمكن تعديل تحويل مُسوَّى", ur: "طے شدہ ٹرانسفر میں ترمیم نہیں کی جا سکتی" },
  // Global all-time summary (Admin Dashboard)
  allTimeGlobalSummary: { en: "All-Time Global Summary", ar: "الملخص الإجمالي لكل الوقت", ur: "تمام وقت کا عمومی خلاصہ" },
  totalRevenues: { en: "Total Revenues", ar: "إجمالي الإيرادات", ur: "کل آمدنی" },
  totalOwnerProfit: { en: "Total Owner Profit", ar: "إجمالي ربح المالك", ur: "مالک کا کل منافع" },
  totalDriverEarnings: { en: "Total Driver Earnings", ar: "إجمالي أرباح السائقين", ur: "ڈرائیورز کی کل کمائی" },
  exportInvoice: { en: "Export Invoice", ar: "تصدير فاتورة", ur: "انوائس برآمد کریں" },
  // Daily Operations
  dailyOperations: { en: "Daily Operations", ar: "العمليات اليومية", ur: "روزانہ آپریشنز" },
  todayOnly: { en: "Today only", ar: "اليوم فقط", ur: "صرف آج" },
  liveAutoRefresh: { en: "Live · refreshes every 30s", ar: "مباشر · يتحدث كل ٣٠ ث", ur: "براہ راست · ہر ٣٠ سیکنڈ" },
  noOpsToday: { en: "No operations recorded today", ar: "لا توجد عمليات مسجلة اليوم", ur: "آج کوئی آپریشن نہیں" },
  driverHasNoOpsToday: { en: "No activity today", ar: "لا يوجد نشاط اليوم", ur: "آج کوئی سرگرمی نہیں" },
  opsCountToday: { en: "ops today", ar: "عملية اليوم", ur: "آپریشنز آج" },
  vehicle: { en: "Vehicle", ar: "المركبة", ur: "گاڑی" },
  time: { en: "Time", ar: "الوقت", ur: "وقت" },
  type: { en: "Type", ar: "النوع", ur: "قسم" },
  details: { en: "Details", ar: "التفاصيل", ur: "تفصیلات" },
  revenue: { en: "Revenue", ar: "إيراد", ur: "آمدنی" },
  expense: { en: "Expense", ar: "مصروف", ur: "خرچہ" },
  transfer: { en: "Transfer", ar: "تحويل", ur: "ٹرانسفر" },
  // Settlement PDF / Share
  sharePdfReport: { en: "Share PDF Report", ar: "مشاركة تقرير PDF", ur: "PDF رپورٹ شیئر کریں" },
  generatingPdf: { en: "Preparing PDF…", ar: "جارٍ إعداد التقرير…", ur: "PDF تیار ہو رہی ہے…" },
  pdfReady: { en: "PDF ready", ar: "التقرير جاهز", ur: "PDF تیار" },
  pdfFailed: { en: "Could not generate PDF", ar: "تعذر إنشاء التقرير", ur: "PDF بنانے میں ناکام" },
  settlementReceipt: { en: "Settlement Receipt", ar: "إيصال التسوية", ur: "تصفیہ رسید" },
  reportTitle: { en: "Driver Settlement Report", ar: "تقرير تسوية السائق", ur: "ڈرائیور تصفیہ رپورٹ" },
  cycleStart: { en: "Cycle Start", ar: "بداية الدورة", ur: "سائیکل کی ابتدا" },
  cycleEnd: { en: "Cycle End", ar: "نهاية الدورة", ur: "سائیکل کا اختتام" },
  reportGenerated: { en: "Generated", ar: "تاريخ التقرير", ur: "تیار کردہ" },
  operationsTable: { en: "Operations", ar: "العمليات", ur: "آپریشنز" },
  paidAmount: { en: "Paid (Transfers)", ar: "المدفوع (تحويلات)", ur: "ادا شدہ (ٹرانسفر)" },
  balance: { en: "Balance", ar: "الرصيد", ur: "بقایا" },
  signatureOwner: { en: "Owner Signature", ar: "توقيع المالك", ur: "مالک کا دستخط" },
  signatureDriver: { en: "Driver Signature", ar: "توقيع السائق", ur: "ڈرائیور کا دستخط" },
};

type I18nContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof dictionary) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getLangKey(): string {
  const role = localStorage.getItem("al-shalal-role");
  if (role === "admin") return "al-shalal-lang-admin";
  if (role === "driver") return "al-shalal-lang-driver";
  return "al-shalal-lang-guest";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem(getLangKey());
    return (saved as Language) || "ar";
  });

  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem(getLangKey());
      setLangState((saved as Language) || "ar");
    };
    window.addEventListener("al-shalal-auth-changed", handler);
    return () => window.removeEventListener("al-shalal-auth-changed", handler);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(getLangKey(), newLang);
  };

  useEffect(() => {
    if (lang === "ar" || lang === "ur") {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
  }, [lang]);

  const t = (key: keyof typeof dictionary) => {
    return dictionary[key]?.[lang] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
}

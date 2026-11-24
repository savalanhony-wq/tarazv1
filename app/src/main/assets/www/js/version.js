/* version.js — تنها جایی که شماره نسخه نوشته می‌شود (تاریخ شمسی: سال‌ماه‌روز) */
const APP_VERSION='14050903';
const APP_VERSION_FA=APP_VERSION.replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-ver]').forEach(e=>e.textContent=APP_VERSION_FA));

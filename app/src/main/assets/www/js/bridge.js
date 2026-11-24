/* پل برنامه اندروید: ذخیره فایل و چاپ را از WebView به کد بومی می‌فرستد */
(function () {
  if (!window.AndroidBridge) return;
  window.print = function () { window.AndroidBridge.print(); };
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var a = this;
    if (a.download && /^blob:/.test(a.href)) {
      fetch(a.href).then(function (r) { return r.blob(); }).then(function (b) {
        var fr = new FileReader();
        fr.onload = function () {
          window.AndroidBridge.saveFile(a.download, b.type || 'application/octet-stream', String(fr.result).split(',')[1]);
        };
        fr.readAsDataURL(b);
      });
      return;
    }
    return origClick.call(a);
  };
})();

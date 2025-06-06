* **Modal 是一種互動方式**
  就是畫面上跳出一個東西，使用者非得處理完它（像是按確認或取消）才可以繼續做別的事，這種情況就叫「模態（Modal）」。

* **Dialog 是 Modal 的一種具體表現**
  Dialog 就是那個跳出來的小視窗，可能是提示你「確定刪除？」或者「輸入密碼」這種，屬於 Modal 的一種表現方式。

* **Dialog 裡通常會有什麼內容？**
  像是：標題、說明文字、按鈕（最多兩顆，像是「取消」、「確認」），還有可能會有圖示或遮罩。

---

* **說「Dialog 是 Modal 的子元件」這說法容易誤導**
  正確的說法是：Modal 是一種「使用方式」，而 Dialog 是實作這種使用方式的元件之一。你也可以用 Drawer 或 Popover 來實作 Modal，只要背景不能操作就算是 Modal。

* **Modal 不是所有 UI 元件的「底層基礎」**
  有些像 Drawer、Menu、Popover 這類元件不一定是 Modal，看你有沒有讓背景可以操作。能操作背景＝非模態，不能操作＝模態。

* **「close」和「cancel」的按鈕名稱沒規定？其實有建議！**
  像 Google 的設計規範會建議用語要清楚，例如「取消」是取消這次操作，「關閉」是只是把視窗關掉但不做事。最好根據實際情境用對字。

---

1. **Modal 是「互動方式」，Dialog 是 Modal 的一種呈現方法。**
2. **能不能操作背景，是不是 Modal 的關鍵。**
3. **Dialog 最多放兩個按鈕，語意要清楚（取消 vs 關閉）**
4. **Popover、Drawer 可以是 Modal，也可以不是，端看怎麼設計。**


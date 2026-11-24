const stage = new URLSearchParams(location.search).get('stage');
const files = ['demo.html', 'demo.css', 'demo.js', 'demo.details'];
const button = document.querySelector('#download-all');
const status = document.querySelector('#status');
const supportsPicker = typeof window.showDirectoryPicker === 'function';

if (stage !== 'chapter1/starter') {
  button.disabled = true;
  status.textContent = '対応していない教材です。';
} else {
  document.querySelector('#stage').textContent = stage;
  for (const file of files) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = stage + '/' + file;
    link.download = file;
    link.textContent = file;
    item.appendChild(link);
    document.querySelector('#individual').appendChild(item);
  }
  if (supportsPicker === true) {
    button.textContent = '保存先フォルダを選んでダウンロード';
  }
  button.addEventListener('click', async () => {
    status.textContent = '';
    if (supportsPicker === false) {
      for (const link of document.querySelectorAll('#individual a')) {
        link.click();
      }
      status.textContent = 'ダウンロード履歴で4ファイルを確認してください。';
      return;
    }

    button.disabled = true;
    let saved = 0;
    try {
      const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
      const existing = [];
      for (const file of files) {
        try {
          await directory.getFileHandle(file);
          existing.push(file);
        } catch (error) {
          if (error.name !== 'NotFoundError') {
            throw error;
          }
        }
      }
      if (existing.length > 0 && window.confirm('次のファイルを上書きしますか？\n' + existing.join('\n')) === false) {
        status.textContent = '保存を中止しました。';
        return;
      }
      const blobs = await Promise.all(files.map(async (file) => {
        const response = await fetch(stage + '/' + file);
        if (response.ok === false) {
          throw new Error('取得失敗: ' + file);
        }
        return response.blob();
      }));
      for (let i = 0; i < files.length; i++) {
        const handle = await directory.getFileHandle(files[i], { create: true });
        const writable = await handle.createWritable();
        await writable.write(blobs[i]);
        await writable.close();
        saved++;
      }
      status.textContent = saved + 'ファイルの保存が完了しました。';
    } catch (error) {
      status.textContent = error.name === 'AbortError' && saved === 0
        ? '処理を中止しました。'
        : '保存処理が完了しませんでした（保存完了: ' + saved + '件）。' + error.message;
    } finally {
      button.disabled = false;
    }
  });
}

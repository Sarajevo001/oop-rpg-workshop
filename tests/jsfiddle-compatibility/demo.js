window.executionCount = (window.executionCount || 0) + 1;

document.querySelector('#result').textContent =
  'JavaScript実行回数：' + window.executionCount;

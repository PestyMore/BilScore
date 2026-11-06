// 原生风格弹窗：跟随 Felt Table 设计系统的 CSS 变量，不引入第三方组件。
// 用 DOM API 构造（而不是 inline script），因此不受 CSP 限制。

export const appConfirm = (message: string, title: string = '提示'): Promise<boolean> =>
  new Promise((resolve) => createDialog(title, message, true, resolve));

export const appAlert = (message: string, title: string = '提示'): Promise<void> =>
  new Promise((resolve) => createDialog(title, message, false, () => resolve()));

const createDialog = (title: string, message: string, showCancel: boolean, resolve: (val: boolean) => void) => {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: var(--scrim, rgba(3,8,6,.68));
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    opacity: 0; transition: opacity 200ms cubic-bezier(.32,.72,0,1);
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    width: 100%; max-width: 340px;
    background: var(--surface-solid, #101e19);
    border: 1px solid var(--border, rgba(232,226,205,.1));
    border-radius: var(--r-lg, 22px);
    padding: 22px 20px 16px;
    box-shadow: 0 24px 60px rgba(0,0,0,.45);
    transform: scale(.92);
    transition: transform 220ms cubic-bezier(.32,.72,0,1);
    display: flex; flex-direction: column; align-items: center; text-align: center;
  `;

  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-size: 17px; font-weight: 700; color: var(--text-1); margin-bottom: 8px;';

  const msgEl = document.createElement('div');
  msgEl.textContent = message;
  msgEl.style.cssText = 'font-size: 15px; color: var(--text-2); line-height: 1.55; margin-bottom: 22px;';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 10px; width: 100%;';

  const createBtn = (text: string, isPrimary: boolean, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      flex: 1; min-height: 46px; border: none; border-radius: 14px;
      font-size: 16px; font-weight: 600; cursor: pointer;
      transition: transform 120ms cubic-bezier(.32,.72,0,1);
    `;
    if (isPrimary) {
      btn.style.background = 'var(--primary-grad)';
      btn.style.color = '#fff';
    } else {
      btn.style.background = 'var(--surface-2)';
      btn.style.color = 'var(--text-1)';
    }

    btn.onclick = () => {
      btn.style.transform = 'scale(.96)';
      overlay.style.opacity = '0';
      box.style.transform = 'scale(.92)';
      setTimeout(() => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        onClick();
      }, 180);
    };
    return btn;
  };

  if (showCancel) {
    btnRow.appendChild(createBtn('取消', false, () => resolve(false)));
    btnRow.appendChild(createBtn('确定', true, () => resolve(true)));
  } else {
    btnRow.appendChild(createBtn('我知道了', true, () => resolve(true)));
  }

  box.appendChild(titleEl);
  box.appendChild(msgEl);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    box.style.transform = 'scale(1)';
  });
};

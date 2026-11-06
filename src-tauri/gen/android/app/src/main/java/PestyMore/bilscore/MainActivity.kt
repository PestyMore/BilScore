package PestyMore.bilscore

class MainActivity : TauriActivity() {
  // wry 的 WryActivity 默认 handleBackNavigation = true（返回键优先回退 WebView 历史），
  // 但 TauriActivity 把它覆盖成了 false，导致 Android 返回键/返回手势直接退出应用。
  // 这里改回 true：有历史就回上一页（Vue Router 监听 popstate），首页才退出。
  //
  // 不启用 edge-to-edge：系统栏由 themes.xml 着色并占位，WebView 自动避开状态栏与
  // 导航栏，前端无需为 Android 注入 insets，也不会出现内容被系统栏遮挡。
  override val handleBackNavigation: Boolean = true
}

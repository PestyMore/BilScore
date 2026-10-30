package PestyMore.bilscore

import android.os.Bundle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  // wry 的 WryActivity 默认 handleBackNavigation = true（返回键优先回退 WebView 历史），
  // 但 TauriActivity 把它覆盖成了 false，导致 Android 返回键/返回手势直接退出应用。
  // 这里改回 true：有历史就回上一页（Vue Router 监听 popstate），首页才退出。
  override val handleBackNavigation: Boolean = true

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }
}

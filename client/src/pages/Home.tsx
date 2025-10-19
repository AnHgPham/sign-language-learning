import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Video, BookOpen, TrendingUp } from "lucide-react";

/**
 * All content in this page are only for example, delete if unneeded
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  // If theme is switchable in App.tsx, we can implement theme toggling like this:
  // const { theme, toggleTheme } = useTheme();

  // Use APP_LOGO (as image src) and APP_TITLE if needed

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              SL
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Sign Language Learning
            </h1>
          </div>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Xin chào, {user?.name}</span>
              <Button variant="outline" onClick={logout}>Đăng xuất</Button>
            </div>
          ) : (
            <Button asChild>
              <Link href="/login">Đăng nhập</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Học ngôn ngữ ký hiệu Việt Nam
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Nền tảng học ngôn ngữ ký hiệu với công nghệ AI nhận diện realtime. 
              Học theo từng từ hoặc thực hành tự do với webcam.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Link href="/practice">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Bắt đầu học
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/realtime">
                  <Video className="mr-2 h-5 w-5" />
                  Thử nghiệm realtime
                </Link>
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 hover:border-blue-400 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Nhận diện Realtime</CardTitle>
                <CardDescription className="text-base">
                  Bật webcam và thực hành tự do. AI sẽ nhận diện các ký hiệu bạn làm ngay lập tức.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ Nhận diện 17 ký hiệu tiếng Việt</li>
                  <li>✓ Phản hồi tức thì với độ chính xác cao</li>
                  <li>✓ Không cần đăng nhập để thử nghiệm</li>
                </ul>
                <Button className="w-full mt-4" variant="outline" asChild>
                  <Link href="/realtime">Thử ngay</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-purple-400 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">Học theo bài</CardTitle>
                <CardDescription className="text-base">
                  Học từng ký hiệu một cách có hệ thống như Duolingo. Theo dõi tiến độ và đạt thành tựu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ Bài học từ cơ bản đến nâng cao</li>
                  <li>✓ Theo dõi tiến độ học tập</li>
                  <li>✓ Chấm điểm tự động</li>
                </ul>
                <Button className="w-full mt-4" asChild>
                  <Link href="/practice">Bắt đầu học</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          {isAuthenticated && (
            <div className="mt-16 max-w-3xl mx-auto">
              <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <TrendingUp className="h-6 w-6" />
                    Tiến độ của bạn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold">17</div>
                      <div className="text-sm opacity-90">Ký hiệu có sẵn</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">0</div>
                      <div className="text-sm opacity-90">Đã học</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">0</div>
                      <div className="text-sm opacity-90">Phiên luyện tập</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2025 Sign Language Learning Platform. Powered by YOLO11 AI.</p>
        </div>
      </footer>
    </div>
  );
}

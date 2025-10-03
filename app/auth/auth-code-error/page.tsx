import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AuthCodeError() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">인증 오류</h1>
            <p className="text-sm text-muted-foreground">
              죄송합니다. 이메일 인증에 실패했습니다. 링크가 만료되었거나 유효하지 않을 수 있습니다.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              다시 회원가입을 시도하거나 문제가 계속되면 고객지원에 문의해주세요.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="bg-black text-white hover:bg-black/90">
                <Link href="/auth/signup">다시 회원가입</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/auth/signin">로그인으로 돌아가기</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
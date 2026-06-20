import { redirect } from "next/navigation";

// 대시보드는 이제 메인(홈) 화면입니다. 기존 링크 호환을 위해 홈으로 이동시킵니다.
export default function DashboardPage() {
  redirect("/");
}

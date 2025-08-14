import { ReactNode } from "react"
import { AppSidebar } from "./AppSidebar"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex w-full">
        <AppSidebar />
        
        <main className="flex-1 lg:ml-0">
          <div className="min-h-screen p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
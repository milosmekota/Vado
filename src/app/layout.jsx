import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

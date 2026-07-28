// pm2 프로세스 매니저용 설정 (실제 배포 서버에서 사용). 로컬 개발에는 필요 없습니다 —
// 로컬에서는 `npm run dev`(concurrently)로 3개 앱을 한 번에 실행합니다.
module.exports = {
  apps: [
    {
      name: "cms-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      env: { NODE_ENV: "production" },
    },
    {
      name: "cms-admin",
      cwd: "./apps/admin",
      // npm workspaces가 next를 모노레포 루트로 호이스팅하므로 apps/admin/node_modules/.bin/next는
      // 존재하지 않습니다. 루트에 설치된 실제 진입점을 직접 가리켜야 pm2가 기동합니다.
      script: "../../node_modules/next/dist/bin/next",
      args: "start -p 3001",
      env: { NODE_ENV: "production" },
    },
    {
      name: "cms-website",
      cwd: "./apps/website",
      script: "../../node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production" },
    },
  ],
};

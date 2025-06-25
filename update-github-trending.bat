@echo off
echo 正在更新GitHub热门项目数据...
node server/tasks/updateGithubTrending.js
echo.
echo 如果没有错误信息，则更新成功！
echo 数据保存在server/data/github-trending目录中
echo.
pause 
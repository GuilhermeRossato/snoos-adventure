
# Snoo's Adventure

Snoo's Adventure is a platform game built using HTML5, JavaScript (ES2023), and WebGL, featuring Snoo, the Reddit mascot. The game offers an engaging experience where players navigate levels, collect items, and avoid obstacles using intuitive keyboard controls (arrow keys or WASD). Designed with a responsive layout and optimized for modern browsers, the game includes animations, a custom requestAnimationFrame handler for performance, and a fallback mechanism for image loading. The project is a tribute to the old /r/gamedev banner art and aims to provide a fun and nostalgic experience for players. For the best experience, use the latest version of Google Chrome.

# Preview

<div align="center">
  <img src="./assets/preview.gif" alt="Game Preview" />
</div>

# Backend

The backend is written in C# (.Net) and starts at `./backend/GameServer.cs` and can be compiled and executed with the script at `./backend/dev.bat` (the compiler program must be installed).

Once executed, it starts an HTTP server on a specified or default port (9000), and depending on the request URL, it serves files such as HTML, images, or icons, redirects to specific locations, or returns error responses for invalid or missing resources. The server also sets appropriate HTTP headers for caching, content type, and redirection, ensuring proper handling of client requests.
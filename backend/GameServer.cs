// GameServer: A simple HTTP server to serve game files

using System;
using System.IO;
using System.Net;
using System.Text;

class Program
{
  static void initCwd() {

    // Verify if the "assets" folder is present in the current working directory
    string currentDirectory = Directory.GetCurrentDirectory();
    string assetsPath = Path.Combine(currentDirectory, "assets");

    if (!Directory.Exists(assetsPath))
    {
      // Check if the "assets" folder is present in the parent directory
      var par = Directory.GetParent(currentDirectory);
      string parentDirectory = par != null ? par.FullName : null;
      if (parentDirectory != null)
      {
        string parentAssetsPath = Path.Combine(parentDirectory, "assets");
        if (Directory.Exists(parentAssetsPath))
        {
          // Move the current working directory to the parent
          Directory.SetCurrentDirectory(parentDirectory);
          Console.WriteLine("Changed working directory to parent: " + parentDirectory);
        }
        else
        {
          Console.Error.WriteLine("Error: 'assets' folder not found in the current or parent directory.");
          Environment.Exit(1);
        }
      }
      else
      {
        Console.Error.WriteLine("Error: Unable to determine parent directory.");
        Environment.Exit(1);
      }
    }
    else
    {
      Console.WriteLine("'assets' folder found in the current directory.");
    }

  }
  static void Main(string[] args)
  {
    initCwd();
    string host = args.Length > 0 ? args[0] : "0.0.0.0";
    int port = 0;
    int parsedPort;
    if (args.Length > 1 && int.TryParse(args[1], out parsedPort) && parsedPort > 0 && parsedPort < 65536)
    {
      port = parsedPort;
    }
    if (port <= 0 || port >= 65536)
    {
      port = 9000;
    }

    HttpListener server = new HttpListener();
    server.Prefixes.Add("http://" + "127.0.0.1" + ":" + port + "/");
    Console.WriteLine("Starting server at http://" + "127.0.0.1" + ":" + port + "/");
    // sleep for 1 second to allow time for server to start
    System.Threading.Thread.Sleep(1000);

    try
    {
      server.Start();
      Console.WriteLine("Listening at http://" + host + ":" + port + "/");

      while (true)
      {
        HttpListenerContext context = null;
        try
        {
          context = server.GetContext();
          // Console.WriteLine("Received request for: " + context.Request.RawUrl);
          try
          {
        ProcessRequest(context);
          }
          catch (Exception innerEx)
          {
        Console.Error.WriteLine("Error processing request: " + innerEx.Message);
        Console.Error.WriteLine("Stack trace: " + innerEx.StackTrace);
        RespondWithError(context, 500, "Internal Server Error");
          }
        }
        catch (Exception ex)
        {
          Console.Error.WriteLine("Failed to handle request: " + ex.Message);
          Console.Error.WriteLine("Stack trace: " + ex.StackTrace);
        }
      }
    }
    catch (HttpListenerException ex)
    {
      Console.Error.WriteLine("Server error: " + ex.Message);
      Console.Error.WriteLine("Error stack: " + ex.StackTrace);

      if (ex.ErrorCode == 183) // EADDRINUSE equivalent
        Console.Error.WriteLine("Port " + port + " is already in use. Please choose a different port.");

      Environment.Exit(1);
    }
    finally
    {
      server.Close();
    }
  }

  static void ProcessRequest(HttpListenerContext context)
  {
    string url = context.Request.RawUrl;
    string method = context.Request.HttpMethod;
    string remoteAddress = context.Request.RemoteEndPoint.ToString();

    try
    {
      if (url == "/" || url == "/index.html" || url == "/frontend/index.html")
      {
        ServeFile(context, "./index.html", "text/html; charset=UTF-8", 1);
        return;
      }
      if (url == "/" || url == "/redirect.html" || url == "/redirect")
      {
        ServeFile(context, "./redirect.html", "text/html; charset=UTF-8", 1);
        return;
      }

      if (url.EndsWith("favicon.ico") || url == "/favicons/favicon.ico")
      {
        ServeFile(context, "./favicons/favicon.ico", "image/x-icon", 60);
        return;
      }

      string[] staticList = { "/images/header.png", "/images/background.png" };
      foreach (string staticFile in staticList)
      {
        if (url.EndsWith(staticFile))
        {
          ServeFile(context, "." + staticFile, "image/png", 240);
          return;
        }
      }

      Console.WriteLine(method + " " + url + " (Serving file)");

      string filePath = url.TrimStart('/');
      if (string.IsNullOrEmpty(filePath) || filePath == "index.html" || filePath == "index.html")
      {
        Redirect(context, "./index.html");
        return;
      }

      if (!File.Exists(filePath))
      {
        Console.WriteLine(method + " " + url + " Cannot serve file (not found): " + filePath);
        RespondWithError(context, 404, "Error: Could not find file");
        return;
      }

      if (Directory.Exists(filePath))
      {
        filePath = Path.Combine(filePath, "index.html");
        if (!File.Exists(filePath))
        {
          Console.WriteLine(method + " " + url + " Cannot serve index file (not found): " + filePath);
          RespondWithError(context, 404, "Error: Could not find file");
          return;
        }
      }

      ServeFile(context, filePath, GetMimeType(filePath), 0);
    }
    catch (Exception ex)
    {
      Console.WriteLine(method + " " + url + " Failed");
      Console.Error.WriteLine("Request handling failed: " + ex.Message);
      RespondWithError(context, 500, "" + ex.GetType().Name + ": " + ex.Message);
    }
  }

  static void ServeFile(HttpListenerContext context, string filePath, string contentType, int maxAge)
  {
    try
    {
      byte[] data = File.ReadAllBytes(filePath);
      FileInfo fileInfo = new FileInfo(filePath);

      context.Response.StatusCode = 200;
      context.Response.ContentType = contentType;
      context.Response.ContentLength64 = data.Length;
      context.Response.Headers.Add("Content-Type", contentType);
      context.Response.Headers.Add("Date", DateTime.UtcNow.ToString("R"));
      context.Response.Headers.Add("Last-Modified", fileInfo.LastWriteTimeUtc.ToString("R"));
      context.Response.Headers.Add("Cache-Control", "public, max-age={maxAge}");
      context.Response.Headers.Add("Pragma", "public");
      context.Response.Headers.Add("Expires", DateTime.UtcNow.AddSeconds(maxAge).ToString("R"));

      if (context.Request.HttpMethod == "HEAD" || context.Request.HttpMethod == "OPTIONS")
      {
        context.Response.Close();
        return;
      }

      context.Response.OutputStream.Write(data, 0, data.Length);
      context.Response.Close();
    }
    catch (Exception ex)
    {
      Console.WriteLine("Failed to serve file {0}", filePath);
      Console.Error.WriteLine("File serving failed: " + ex.Message);
      RespondWithError(context, 500, ex.GetType().Name + ": " + ex.Message);
    }
  }

  static void Redirect(HttpListenerContext context, string location)
  {
    context.Response.StatusCode = 307;
    context.Response.Redirect(location);
    context.Response.Close();
  }

  static void RespondWithError(HttpListenerContext context, int statusCode, string message)
  {
    context.Response.StatusCode = statusCode;
    byte[] data = Encoding.UTF8.GetBytes(message);
    context.Response.ContentType = "text/plain";
    context.Response.ContentLength64 = data.Length;
    context.Response.OutputStream.Write(data, 0, data.Length);
    context.Response.Close();
  }
  static string GetMimeType(string filePath)
  {
    string extension = Path.GetExtension(filePath).ToLowerInvariant();
    // Console.WriteLine("Determining MIME type for extension: " + extension);
    string mimeType;

    if (extension == ".html")
    {
      mimeType = "text/html";
    }
    else if (extension == ".ico")
    {
      mimeType = "image/x-icon";
    }
    else if (extension == ".png")
    {
      mimeType = "image/png";
    }
    else if (extension == ".css")
    {
      mimeType = "text/css";
    }
    else if (extension == ".js")
    {
      mimeType = "application/javascript";
    }
    else
    {
      mimeType = "application/octet-stream"; // Default MIME type
    }

    return mimeType;
  }
}

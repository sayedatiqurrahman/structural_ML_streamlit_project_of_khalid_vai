import streamlit as st
import threading
import time
import urllib.request

st.set_page_config(page_title="StructuraML", page_icon="\U0001F3D7\uFE0F", layout="wide", initial_sidebar_state="collapsed")

st.markdown("""
<style>
#MainMenu, header, footer, .stAppDeployButton, [data-testid="stToolbar"],
[data-testid="stDecoration"], [data-testid="stStatusWidget"],
[data-testid="stNotification"], section[data-testid="stSidebar"] {
    display: none !important;
}
.stApp {position:fixed;top:0;left:0;width:100vw;height:100vh;overflow:hidden;background:#f8fafc;}
.appview-container,.main,.block-container {padding:0 !important;max-width:100% !important;height:100% !important;}
body {margin:0 !important;padding:0 !important;overflow:hidden !important;}
</style>
""", unsafe_allow_html=True)

UVICORN_PORT = 8765

def start_server():
    import uvicorn
    from main import app
    uvicorn.run(app, host="127.0.0.1", port=UVICORN_PORT, log_level="warning")

threading.Thread(target=start_server, daemon=True).start()

for i in range(20):
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{UVICORN_PORT}/")
        break
    except:
        time.sleep(0.5)

st.markdown(f"""<iframe src="http://127.0.0.1:{UVICORN_PORT}/" style="position:fixed;top:0;left:0;width:100vw;height:100vh;border:none;z-index:999999999;background:#f8fafc"></iframe>""", unsafe_allow_html=True)
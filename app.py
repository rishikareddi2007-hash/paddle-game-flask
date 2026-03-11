from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import os, json
from functools import wraps

app = Flask(__name__)
app.secret_key = "replace_this_with_a_random_secret"
DATA_FILE = "player_data.json"

DEFAULT_PROFILE = {
    "coins": 0,
    "lives": 3,
    "unlocked_levels": [1],
    "high_scores": [],
    "settings": {"music":"on"}
}

TOTAL_LEVELS = 20

def load_all():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w") as f:
            json.dump({}, f)
        return {}
    with open(DATA_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_all(all_data):
    with open(DATA_FILE, "w") as f:
        json.dump(all_data, f, indent=2)

def get_user_profile(username):
    all_data = load_all()
    if username not in all_data:
        all_data[username] = DEFAULT_PROFILE.copy()
        save_all(all_data)
    return all_data[username]

def save_user_profile(username, profile):
    all_data = load_all()
    all_data[username] = profile
    save_all(all_data)

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "username" not in session:
            return jsonify({"ok": False, "error": "Not logged in"}), 401
        return fn(*args, **kwargs)
    return wrapper

@app.route("/")
def landing():
    if "username" in session:
        return redirect(url_for("home"))
    return render_template("login.html")

@app.route("/home")
def home():
    if "username" not in session:
        return redirect(url_for("landing"))
    return render_template("home.html")

@app.route("/levels")
def levels():
    if "username" not in session:
        return redirect(url_for("landing"))
    return render_template("levels.html")

@app.route("/game")
def game():
    if "username" not in session:
        return redirect(url_for("landing"))
    return render_template("game.html")

@app.route("/settings")
def settings():
    if "username" not in session:
        return redirect(url_for("landing"))
    return render_template("settings.html")

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    username = data.get("username","").strip()
    if not username:
        return jsonify({"ok":False,"error":"Username required"}), 400
    all_data = load_all()
    if username not in all_data:
        all_data[username] = DEFAULT_PROFILE.copy()
        save_all(all_data)
    session["username"] = username
    return jsonify({"ok":True, "username": username})

@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.pop("username", None)
    return jsonify({"ok": True})

@app.route("/api/me")
@login_required
def api_me():
    username = session["username"]
    profile = get_user_profile(username)
    resp = {"username": username}
    resp.update(profile)
    resp["total_levels"] = TOTAL_LEVELS
    return jsonify(resp)

@app.route("/api/complete_level", methods=["POST"])
@login_required
def api_complete_level():
    payload = request.get_json()
    level = int(payload.get("level",1))
    score = int(payload.get("score",0))
    earned_coins = int(payload.get("coins", 10))
    extra_lives = int(payload.get("lives", 0))

    username = session["username"]
    profile = get_user_profile(username)

    profile["coins"] = profile.get("coins",0) + earned_coins
    profile["lives"] = profile.get("lives",0) + extra_lives

    hs = profile.setdefault("high_scores", [])
    hs.append({"level": level, "score": score})
    hs.sort(key=lambda x: x["score"], reverse=True)
    profile["high_scores"] = hs[:50]

    next_level = level + 1
    if next_level <= TOTAL_LEVELS and next_level not in profile["unlocked_levels"]:
        profile["unlocked_levels"].append(next_level)
        profile["unlocked_levels"].sort()

    save_user_profile(username, profile)
    return jsonify({"ok":True, "profile": profile})

@app.route("/api/use_life", methods=["POST"])
@login_required
def api_use_life():
    username = session["username"]
    profile = get_user_profile(username)
    if profile.get("lives",0) <= 0:
        return jsonify({"ok":False,"error":"No lives"}), 400
    profile["lives"] -= 1
    save_user_profile(username, profile)
    return jsonify({"ok":True, "lives": profile["lives"]})

@app.route("/api/settings", methods=["POST"])
@login_required
def api_settings():
    payload = request.get_json()
    username = session["username"]
    profile = get_user_profile(username)
    profile.setdefault("settings", {})
    profile["settings"].update(payload)
    save_user_profile(username, profile)
    return jsonify({"ok":True, "settings": profile["settings"]})

@app.route("/api/_users")
def api_users():
    return jsonify(load_all())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

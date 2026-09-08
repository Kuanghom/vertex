# -*- coding: utf-8 -*-
"""Build sanitized preset catalog from vertex-rule.zip. No secrets written."""
import json
import os
import re
import zipfile
from collections import OrderedDict

ZIP_PATH = r"C:/Users/10351/Downloads/vertex-rule.zip"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "app", "presets")

SECRET_KEYS = {
    "password", "username", "clientUrl", "cookie", "rssUrls",
    "host", "port", "used", "status", "allTimeUpload", "allTimeDownload",
    "uploadSpeed", "downloadSpeed", "leechingCount", "seedingCount"
}

ADVANCED_ALIASES = {
    "天空暂停", "天空暂停一小时", "天空暂停一小时（新）",
    "北洋-hr请求", "北洋-种子删选", "北洋选种",
    "猫站-拒绝老种子",
}


def load_dir(zf, prefix):
    items = []
    for name in zf.namelist():
        if name.startswith(prefix) and name.endswith(".json") and not name.endswith("/"):
            items.append(json.loads(zf.read(name).decode("utf-8")))
    return items


def slug(alias):
    text = re.sub(r"\s+", "", str(alias or "").strip())
    text = text.replace("|", "-").replace("/", "-").replace("\\", "-")
    text = text.replace("\t", "")
    return text or "unnamed"


def sanitize_js(code):
    if not code:
        return code
    code = re.sub(r"https?://localhost:\d+", "", code)
    code = re.sub(r"apiToken\s*=\s*[\"'][^\"']*[\"']", 'apiToken = ""', code)
    code = re.sub(
        r"const clientIds = this\.clientIds \|\| \[[^\]]*\]",
        "const clientIds = this.clientIds || []",
        code,
    )
    if "642024" in code:
        code = code.replace(
            "if (id < 642024)",
            "const minId = 0; // 填当前站老种分界 id，0 表示不按 id 拒绝\n    if (minId && id < minId)",
        )
    return code


def cond_brief(conds):
    if not conds:
        return ""
    parts = []
    for c in conds[:4]:
        parts.append("%s %s %s" % (c.get("key", ""), c.get("compareType", ""), c.get("value", "")))
    return " | ".join(parts)


def tags_for(kind, item):
    tags = []
    alias = item.get("alias") or ""
    if item.get("type") == "javascript":
        tags.append("JS")
    if any(k in alias for k in ADVANCED_ALIASES) or any(k in alias for k in ("北洋", "天空暂停", "猫站")):
        tags.append("进阶")
    if kind in ("rss", "select") and ("G" in alias or "g" in alias or "小于" in alias or "大于" in alias):
        tags.append("体积")
    if kind == "delete" and ("空间" in alias or "剩余" in alias):
        tags.append("空间")
    if kind == "task":
        tags.append("站点")
    if kind == "client":
        tags.append("下载器")
    if "进阶" not in tags and kind in ("delete", "rss", "select"):
        tags.append("通用")
    return tags


def strip_rule(item):
    out = {}
    for key, value in item.items():
        if key in ("id", "used"):
            continue
        if key == "code":
            out[key] = sanitize_js(value)
        else:
            out[key] = value
    if "alias" in out:
        out["alias"] = str(out["alias"]).replace("\t", "").strip()
    return out


def strip_task(item):
    return {
        "alias": item.get("alias") or "",
        "category": item.get("category") or "",
        "scrapeFree": bool(item.get("scrapeFree")),
        "scrapeHr": bool(item.get("scrapeHr")),
        "cron": item.get("cron") or "*/5 * * * *",
        "addCountPerHour": item.get("addCountPerHour"),
        "downloadLimit": item.get("downloadLimit"),
        "downloadLimitUnit": item.get("downloadLimitUnit"),
        "uploadLimit": item.get("uploadLimit"),
        "uploadLimitUnit": item.get("uploadLimitUnit"),
        "skipSameTorrent": item.get("skipSameTorrent"),
        "paused": item.get("paused"),
        "pushNotify": item.get("pushNotify"),
        "pushTorrentFile": item.get("pushTorrentFile"),
        "autoReseed": item.get("autoReseed"),
        "onlyReseed": item.get("onlyReseed"),
        "maxSleepTime": item.get("maxSleepTime"),
        "enable": False,
        "rssUrls": [],
        "cookie": "",
        "clientArr": [],
        "reseedClients": [],
        "sameServerClients": [],
        "acceptRules": [],
        "rejectRules": [],
    }


def strip_client(item, alias):
    return {
        "alias": alias,
        "type": item.get("type") or "qBittorrent",
        "enable": False,
        "host": "",
        "port": "",
        "username": "",
        "password": "",
        "cron": item.get("cron") or "*/4 * * * * *",
        "autoDelete": bool(item.get("autoDelete")),
        "autoDeleteCron": item.get("autoDeleteCron") or "* * * * *",
        "autoReannounce": item.get("autoReannounce", True),
        "firstLastPiecePrio": item.get("firstLastPiecePrio", True),
        "pushNotify": False,
        "pushMonitor": False,
        "spaceAlarm": False,
        "deleteRules": [],
        "rejectDeleteRules": [],
        "sameServerClients": [],
        "minFreeSpace": item.get("minFreeSpace"),
        "maxLeechNum": item.get("maxLeechNum"),
    }


def main():
    zf = zipfile.ZipFile(ZIP_PATH)
    deletes = load_dir(zf, "vertex-rule/data/rule/delete/")
    rss_rules = load_dir(zf, "vertex-rule/data/rule/rss/")
    selects = load_dir(zf, "vertex-rule/data/rule/race/")
    tasks = load_dir(zf, "vertex-rule/data/rss/")
    clients = load_dir(zf, "vertex-rule/data/client/")

    del_by_id = {x["id"]: x for x in deletes}
    rss_by_id = {x["id"]: x for x in rss_rules}

    id_map = {}
    items = []

    def add_item(kind, old_id, alias, payload, rule_ids=None, hint=""):
        pid = "%s:%s" % (kind, slug(alias))
        # unique
        base = pid
        n = 2
        existing = {i["id"] for i in items}
        while pid in existing:
            pid = "%s-%s" % (base, n)
            n += 1
        if old_id:
            id_map["%s:%s" % (kind, old_id)] = pid
        entry = OrderedDict([
            ("id", pid),
            ("kind", kind),
            ("alias", alias),
            ("hint", hint),
            ("tags", tags_for(kind, payload if isinstance(payload, dict) else {"alias": alias})),
            ("ruleIds", rule_ids or []),
            ("payload", payload),
        ])
        items.append(entry)
        return pid

    for row in deletes:
        alias = str(row.get("alias") or "").replace("\t", "").strip()
        payload = strip_rule(row)
        hint = cond_brief(row.get("conditions"))
        if row.get("type") == "javascript":
            hint = hint or "JavaScript 规则，启用前按说明补占位"
        add_item("delete", row.get("id"), alias, payload, hint=hint)

    for row in rss_rules:
        alias = str(row.get("alias") or "").strip()
        payload = strip_rule(row)
        hint = cond_brief(row.get("conditions"))
        if row.get("type") == "javascript":
            hint = hint or "JavaScript 规则，启用前按说明补占位"
        add_item("rss", row.get("id"), alias, payload, hint=hint)

    for row in selects:
        alias = str(row.get("alias") or "").strip()
        payload = strip_rule(row)
        if payload.get("type") == "javascript" and not (payload.get("code") or "").strip():
            # empty copy; skip
            continue
        hint = cond_brief(row.get("conditions"))
        add_item("select", row.get("id"), alias, payload, hint=hint)

    def map_rules(kind, ids):
        out = []
        for oid in ids or []:
            pid = id_map.get("%s:%s" % (kind, oid))
            if pid:
                out.append(pid)
        return out

    for row in tasks:
        alias = str(row.get("alias") or "").strip()
        payload = strip_task(row)
        rule_ids = map_rules("rss", row.get("acceptRules")) + map_rules("rss", row.get("rejectRules"))
        payload["_acceptPreset"] = map_rules("rss", row.get("acceptRules"))
        payload["_rejectPreset"] = map_rules("rss", row.get("rejectRules"))
        hint = alias.split("|", 1)[1].strip() if "|" in alias else "启用时再填 RSS 地址和 Cookie，下载器后绑"
        add_item("task", row.get("id"), alias, payload, rule_ids=rule_ids, hint=hint)

    role = {
        "01NC": "刷流",
        "06不可说": "不可说",
        "07拆包专用": "拆包",
    }
    load_done = False
    for row in clients:
        raw_alias = row.get("alias") or ""
        if raw_alias in role:
            alias = role[raw_alias]
        elif "负载" in raw_alias:
            if load_done:
                continue
            alias = "负载"
            load_done = True
        else:
            alias = raw_alias
        payload = strip_client(row, alias)
        delete_ids = map_rules("delete", row.get("deleteRules"))
        reject_ids = map_rules("delete", row.get("rejectDeleteRules"))
        payload["_deletePreset"] = delete_ids
        payload["_rejectDeletePreset"] = reject_ids
        add_item("client", row.get("id"), alias, payload, rule_ids=delete_ids + reject_ids,
                 hint="启用时再填 WebUI 地址和账号")

    rec_rss = {">1G", ">3G", ">60G", "种子小于3g", "种子小于5g", "种子小于10g", "种子3-40g"}
    rec_delete_needles = (
        "剩余空间", "种子错误", "慢车", "中途停车", "最长下载时间", "长时间未开始",
        "种子进度0.5", "种子进度0.2",
    )
    recommended = []
    for item in items:
        if item["kind"] == "client" and item["alias"] == "刷流":
            recommended.append(item["id"])
            recommended.extend(item["ruleIds"])
        if item["kind"] == "rss" and item["alias"] in rec_rss:
            recommended.append(item["id"])
        if item["kind"] == "delete" and any(n in item["alias"] for n in rec_delete_needles):
            if "进阶" not in item["tags"] and "甲骨文" not in item["alias"] and "瓷器" not in item["alias"]:
                recommended.append(item["id"])

    recommended = list(OrderedDict.fromkeys(recommended))
    all_ids = [i["id"] for i in items]

    catalog = {
        "packs": {
            "recommended": recommended,
            "all": all_ids,
        },
        "groups": [
            {"kind": "client", "title": "下载器"},
            {"kind": "delete", "title": "删种规则"},
            {"kind": "rss", "title": "RSS 规则"},
            {"kind": "select", "title": "选种规则"},
            {"kind": "task", "title": "RSS 任务"},
        ],
        "items": items,
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, "catalog.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
        f.write("\n")

    # sanity: no secrets
    text = open(out_path, encoding="utf-8").read()
    for bad in ("password", "passkey", "localhost:18230", "642024"):
        if bad == "password" and '"password": ""' in text:
            continue
        if bad in text and bad not in ("password",):
            if bad == "642024":
                raise SystemExit("hardcoded torrent id leaked")
            if bad == "localhost:18230":
                raise SystemExit("localhost leaked")
    print("wrote", out_path, "items", len(items), "recommended", len(recommended))


if __name__ == "__main__":
    main()

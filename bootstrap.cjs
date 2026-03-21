"use strict";

const { app, dialog } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");

const startupLogPath = path.join(os.tmpdir(), "MediaArchiver-v2-startup.log");
const startupLogBackupPath = `${startupLogPath}.1`;
const STARTUP_LOG_MAX_BYTES = 512 * 1024;

function serializeDetail(detail) {
    if (detail instanceof Error) {
        return `${detail.name}: ${detail.message}\n${detail.stack ?? ""}`;
    }

    try {
        return JSON.stringify(detail);
    } catch {
        return String(detail);
    }
}

function appendStartupLog(label, detail) {
    const body = detail === undefined ? label : `${label}\n${serializeDetail(detail)}`;
    const line = `[${new Date().toISOString()}] ${body}\n`;

    try {
        if (fs.existsSync(startupLogPath) && fs.statSync(startupLogPath).size >= STARTUP_LOG_MAX_BYTES) {
            if (fs.existsSync(startupLogBackupPath)) {
                fs.rmSync(startupLogBackupPath, { force: true });
            }
            fs.renameSync(startupLogPath, startupLogBackupPath);
        }
        fs.appendFileSync(startupLogPath, line, { encoding: "utf8" });
    } catch {
        // Ignore logging failures and continue startup.
    }
}

function resolveMainEntryPath() {
    return path.join(__dirname, "dist-electron", "main.js");
}

process.on("uncaughtException", (error) => {
    appendStartupLog("uncaughtException", error);
});

process.on("unhandledRejection", (error) => {
    appendStartupLog("unhandledRejection", error);
});

(async () => {
    const mainEntryPath = resolveMainEntryPath();
    appendStartupLog("bootstrap:start", { mainEntryPath, isPackaged: app.isPackaged });

    try {
        await Promise.resolve().then(() => require(mainEntryPath));
        appendStartupLog("bootstrap:main-imported", mainEntryPath);
    } catch (error) {
        appendStartupLog("bootstrap:main-import-failed", {
            mainEntryPath,
            error: serializeDetail(error),
        });

        try {
            dialog.showErrorBox(
                "MediaArchiver 起動エラー",
                `起動に失敗しました。\nログ: ${startupLogPath}`
            );
        } catch {
            // Ignore dialog failures and continue shutdown.
        }

        app.quit();
    }
})();

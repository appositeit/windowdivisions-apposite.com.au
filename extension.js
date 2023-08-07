'use strict';

const {Meta, Shell} = imports.gi;

const Main = imports.ui.main;
const Dash = imports.ui.dash;
const ExtensionUtils = imports.misc.extensionUtils;

class Extension {
    constructor() {
        this._window = null;
        this._previous = null;
    }

    getActiveWindow() {
        return global.workspace_manager
        .get_active_workspace()
        .list_windows()
        .find(window => window.has_focus());
    }

    enable() {
        this._settings = ExtensionUtils.getSettings();
        this.bindKey('center-shortcut', () => this.moveCenter());
        this.bindKey('rotate-shortcut', () => this.moveAround());
    }

    disable() {
        this.unbindKey('center-shortcut');
        this.unbindKey('rotate-shortcut');
        this._settings = null;
        this._window = null;
        this._previous = null;
    }

    moveCenter() {
        this.moveByMode(1);
    }

    moveAround() {
        const divisions = this._settings.get_int('divisions');

        let pos = null;
        if (this._previous === null) {
            pos = 0;
        } else {
            pos = this._previous + 1;
            if (pos >= 2*divisions) {
                pos = 0;
            }
        }
        this.moveByMode(pos);
    }

    moveByMode(pos) {
        const activeWindow = this.getActiveWindow();
        if (!activeWindow) {
            log('No active window');
            return;
        }
        const monitor = activeWindow.get_monitor();
        const workarea = this.getWorkAreaForMonitor(monitor);
        const dash_width = Main.overview.dash.width;

        const divisions = this._settings.get_int('divisions');


        const W = workarea.width / divisions;
        // from the topbar #TODO:setting
        const Y = Main.panel.height + 1;
        const H = workarea.height - Main.panel.height - 2;


        // position from the left
        let X = dash_width + 2 + workarea.width * pos / divisions;

        this.moveWindow(activeWindow, {
            x: Math.floor(X),
            y: Math.floor(Y),
            width: Math.floor(W),
            height: Math.floor(H),
        });
        this._previous = pos;
    }

    moveWindow(window, area) {
        if (!window)
            return;

        if (window.maximized_horizontally || window.maximized_vertically) {
            window.unmaximize(
                Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL
            );
        }
        window.move_resize_frame(true, area.x, area.y, area.width, area.height);
        // In some cases move_resize_frame() will resize but not move the window, so we need to move it again.
        // This usually happens when the window's minimum size is larger than the selected area.
        window.move_frame(true, area.x, area.y);
    }

    getWorkAreaForMonitor(monitor) {
        return global.workspace_manager
      .get_active_workspace()
      .get_work_area_for_monitor(monitor);
    }

    bindKey(key, callback) {
        Main.wm.addKeybinding(
            key,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL,
            callback
        );
    }

    unbindKey(key) {
        Main.wm.removeKeybinding(key);
    }
}

/**
 *
 */
function init() {
    return new Extension();
}

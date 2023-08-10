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
        let nMonitors = global.display.get_n_monitors();
        const divisions = this._settings.get_int('divisions');
        let pos = null;
        if (this._previous === null) {
            pos = 0;
        } else {
            pos = this._previous + 1;
            if (pos >= nMonitors*divisions) {
                pos = 0;
            }
        }
        this.moveByMode(pos);
    }

    /*
    Returns a list of monitors in x order from left to right. Each element of the list
    is a list of monitor properties: x, y, width, height.
    */
    monitorStructure() {
        let monitors = [];

        let nMonitors = global.display.get_n_monitors();
        for(let i=0;i<nMonitors;i++) {
            let wa = this.getWorkAreaForMonitor(i);
            let md = [wa.x, wa.y, wa.width, wa.height]
            if (monitors.length>0) {
                for(let j=0;j<monitors.length;j++) {
                    log(`j: ${j}`)
                    if (monitors[j][0]>wa.x) {
                        monitors.splice(j,0,md);
                        break;
                    }
                }
            }
            if (monitors.length < (i+1)) {
                monitors.push(md);
            }
        }
        return monitors;
    }

    moveByMode(pos) {
        const activeWindow = this.getActiveWindow();
        if (!activeWindow) {
            log('No active window');
            return;
        }
        let monitors = this.monitorStructure();
        const divisions = this._settings.get_int('divisions');
        let nMonitors = global.display.get_n_monitors();
        let dest_monitor = Math.floor(pos/divisions) % nMonitors;
        let section = pos - dest_monitor * divisions;
        let md = monitors[dest_monitor];
        let x = 2;
        x += md[0] + section * md[2] / divisions;
        let y = md[1];
        let W = 0;
        if (md[2] > md[0]) {
            W = (md[2] - md[0])/divisions;
        } else {
            W = md[2]/divisions;
        }
        let H = md[3];

        // log(`x: ${x}, y: ${y}, W: ${W}, H: ${H}`);

        this.moveWindow(activeWindow, {
            x: Math.floor(x),
            y: Math.floor(y),
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

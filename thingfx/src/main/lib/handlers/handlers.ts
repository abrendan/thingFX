import { Handler } from '../../types/WebSocketHandler.js'

import * as accent from './accent.js'
import * as apps from './apps.js'
import * as library from './library.js'
import * as bgstyle from './bgstyle.js'
import * as lock from './lock.js'
import * as orientation from './orientation.js'
import * as theme from './theme.js'
import * as visualizersize from './visualizersize.js'
import * as backbutton from './backbutton.js'
import * as visualizer from './visualizer.js'
import * as wheelmode from './wheelmode.js'
import * as holdtolock from './holdtolock.js'
import * as sleeptimer from './sleeptimer.js'
import * as autoreturn from './autoreturn.js'
import * as lockshortcut from './lockshortcut.js'
import * as shutdown from './shutdown.js'
import * as shutdownshortcut from './shutdownshortcut.js'
import * as defaultview from './defaultview.js'
import * as ping from './ping.js'
import * as playback from './playback.js'
import * as reboot from './reboot.js'
import * as restore from './restore.js'
import * as screensaver from './screensaver.js'
import * as screensaverstyle from './screensaverstyle.js'
import * as sleep from './sleep.js'
import * as time from './time.js'
import * as update from './update.js'
import * as version from './version.js'
import * as wake from './wake.js'
import * as weather from './weather.js'

export const handlers: Handler[] = [
  accent,
  apps,
  library,
  bgstyle,
  lock,
  orientation,
  theme,
  visualizersize,
  backbutton,
  visualizer,
  wheelmode,
  holdtolock,
  sleeptimer,
  autoreturn,
  lockshortcut,
  shutdown,
  shutdownshortcut,
  defaultview,
  ping,
  playback,
  reboot,
  restore,
  screensaver,
  screensaverstyle,
  sleep,
  time,
  update,
  version,
  wake,
  weather
]

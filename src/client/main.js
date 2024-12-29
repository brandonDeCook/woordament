import { Game } from "./scenes/game";
import { Menu } from "./scenes/menu";
import { Loading } from "./scenes/loading";
import AwaitLoaderPlugin from "phaser3-rex-plugins/plugins/awaitloader-plugin.js";
import { Leaderboard } from "./scenes/leaderboard";

const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const mobileWidth = window.innerWidth;
const mobileHeight = window.innerHeight;

const config = {
  type: Phaser.AUTO,
  width: isMobile ? mobileWidth : 800,
  height: isMobile ? mobileHeight : 600,

  parent: "game-container",
  dom: {
    createContainer: true,
  },
  backgroundColor: "#000000",

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  scene: [Menu, Game, Loading, Leaderboard],

  plugins: {
    global: [
      {
        key: "rexAwaitLoader",
        plugin: AwaitLoaderPlugin,
        start: true,
      },
    ],
  },
};

export default new Phaser.Game(config);

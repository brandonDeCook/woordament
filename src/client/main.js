import Phaser from 'phaser';
import { Game } from "./scenes/game";
import { Menu } from "./scenes/menu";
import { Loading } from "./scenes/loading";
import { Leaderboard } from "./scenes/leaderboard";
import { SFX_VOLUME } from "./constants";

const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const mobileWidth = window.innerWidth;
const mobileHeight = window.innerHeight;

const config = {
  type: Phaser.AUTO,
  pixelArt: true,
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
};

// Fractional CSS scaling makes pixel text uneven. On desktop, size the parent to a
// whole multiple of the base size so FIT lands on an integer zoom (plain FIT when smaller).
const container = document.getElementById("game-container");

const sizeContainer = () => {
  const zoom = Math.floor(Math.min(window.innerWidth / config.width, window.innerHeight / config.height));
  const size = zoom >= 1 ? [config.width * zoom, config.height * zoom] : [window.innerWidth, window.innerHeight];
  container.style.width = `${size[0]}px`;
  container.style.height = `${size[1]}px`;
};

if (!isMobile) {
  sizeContainer();
}

const game = new Phaser.Game(config);
game.events.once(Phaser.Core.Events.READY, () => {
  game.sound.setVolume(SFX_VOLUME);
});

if (!isMobile) {
  window.addEventListener("resize", () => {
    sizeContainer();
    game.scale.refresh();
  });
}

export default game;

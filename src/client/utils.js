export default class Utils {
  static generateGUID() {
    const cryptoObj = window.crypto || window.msCrypto;
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const guid = [...bytes]
      .map(
        (byte, index) =>
          byte.toString(16).padStart(2, "0") +
          (index === 3 || index === 5 || index === 7 || index === 9 ? "-" : "")
      )
      .join("");

    return guid;
  }

  static getPlayerFromLocalStorage() {    
    var playerId = localStorage.getItem('playerId');
    var playerNickname = localStorage.getItem('playerNickname');

    return { id: playerId, nickname: playerNickname };
  }

  static setPlayerToLocalStorage(playerId, playerNickname) {
    localStorage.setItem('playerId', playerId);
    localStorage.setItem('playerNickname', playerNickname);
  }
  
  static generateGameNickname() {
    const adjectives = [
        "Speedy", "Silent", "Crazy", "Epic", "Wild", "Dark", "Iron", 
        "Swift", "Brave", "Fierce", "Flappy", "Soft", "Edgey", "Small", 
        "Hard", "Floppy", "Lit", "Rizz"
    ];
    const nouns = [
        "Wolf", "Viper", "Ghost", "Blade", "Ninja", "Beast", "Knight", 
        "Hawk", "Flame", "Claw", "Can", "Cow", "Toad", "Carrot", "Apple",
        "Bison", "Turnip", "Paul"
    ];

    const validCombinations = [];
    for (const adj of adjectives) {
        for (const noun of nouns) {
            const combination = `${adj}${noun}`;
            if (combination.length <= 10) {
                validCombinations.push(combination);
            }
        }
    }

    return validCombinations[Math.floor(Math.random() * validCombinations.length)];
  }
}

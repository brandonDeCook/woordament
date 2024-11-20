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
}
const stderrWrite = process.stderr._write;

export function muteDeprecationWarning() {
  process.stderr._write = function(chunk, encoding, callback) {
    const regex = /DeprecationWarning: grpc.load:/;

    if (regex.test(chunk)) {
      callback();
    } else {
      stderrWrite.apply(this, (arguments as unknown) as [
        any,
        string,
        Function
      ]);
    }
  };

  return function unmute() {
    process.stderr._write = stderrWrite;
  };
}

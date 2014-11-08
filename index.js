var through = require('through');
var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;
var Buffer = require('buffer').Buffer;

module.exports = function(file, opt) {
  if (!file) throw new PluginError('gulp-concat-binary', 'Missing file option for gulp-concat-binary');
  if (!opt) opt = {};

  var firstFile = null;

  var fileName = file;
  if (typeof file !== 'string') {
    if (typeof file.path !== 'string') {
      throw new PluginError('gulp-concat-binary', 'Missing path in file options for gulp-concat-binary');
    }
    fileName = path.basename(file.path);
    firstFile = new File(file);
  }

  var concatBuffers = [];
  var totalLength = 0;
  var mapping = null;
  var isMappingEnabled = !!opt.map;
  var mapFileName;
  if (isMappingEnabled) {
    switch (typeof opt.map) {
      case 'string':
        mapFileName = opt.map;
      break;
      case 'boolean':
        mapFileName = fileName.path + '.map.json';
      break;
      case 'object':
        if (typeof opt.map.path !== 'string') {
          throw new PluginError('gulp-concat-binary', 'Missing path in map options for gulp-concat-binary');
        }
        mapFileName = opt.map.path + '.map.json';
      break;
      default:
        throw new PluginError('gulp-concat-binary', 'Invalid map option');
    }
  }

  function bufferContents(file) {
    if (file.isNull()) return; // ignore
    if (file.isStream()) return this.emit('error', new PluginError('gulp-concat-binary',  'Streaming not supported'));

    if (!firstFile) firstFile = file;

    concatBuffers.push(file.contents);
    var fileLength = file.contents.length;

    if (isMappingEnabled) {
      mapping = mapping || {};

      mapping[file.relative] = {
        index: totalLength,
        length: fileLength
      };
    }

    totalLength += fileLength;
  }

  function endStream() {
    if (firstFile) {
      var joinedFile = firstFile;

      if (typeof file === 'string') {
        joinedFile = firstFile.clone({contents: false});
        joinedFile.path = path.join(firstFile.base, file);
      }

      joinedFile.contents = new Buffer(totalLength);
      for (
            var i = 0, l = concatBuffers.length, concatIndex = 0;
            i < l;
            ++i, concatIndex += buffer.length
          ) {
        concatBuffers[i].copy(joinedFile.contents, concatIndex);
      }

      this.emit('data', joinedFile);

      if (mapping) {
        var mapFile = joinedFile.clone({contents:false});
        mapFile.path = path.join(joinedFile.base, mapFileName);
        mapFile.contents = JSON.stringify(mapping);
        this.emit('data', mapFile);
      }
    }

    this.emit('end');
  }

  return through(bufferContents, endStream);
};
library mpflutter;

import 'dart:io';

import 'package:io/io.dart';
import 'package:path/path.dart' as path;
import 'package:crypto/crypto.dart';

part 'build.dart';
part 'build_web.dart';
part 'build_taro.dart';
part 'create.dart';
part 'upgrade.dart';

main(List<String> args) {
  if (args.length >= 2 && args[0] == 'create') {
    create(args);
  }
  if (args.length >= 1 && args[0] == 'upgrade') {
    upgrade(args);
  }
  if (args.length >= 1 && args[0] == 'build') {
    build(args);
  }
}
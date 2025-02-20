import 'package:flutter/material.dart';
import 'package:mpcore/mpcore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// import 'bak/main.dart';
import 'detail.dart';
import 'search.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
  MPCore().connectToHostChannel();
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MPApp(
      routes: {
        '/': (context) => SearchPage(),
        '/detail': (context) => PackageDetailPage()
        // '/': (context) => MyHomePage()
      },
      navigatorObservers: [MPCore.getNavigationObserver()],
    );
  }
}

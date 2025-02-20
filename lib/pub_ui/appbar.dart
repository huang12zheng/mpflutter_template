import 'package:flutter/material.dart';
// import 'package:flutter_svg/flutter_svg.dart';
import 'package:mpcore/mpcore.dart';

class PubAppbar extends StatelessWidget implements PreferredSizeWidget {
  const PubAppbar({super.key});

  @override
  Widget build(BuildContext context) {
    return MPAppBar(
      context: context,
      backgroundColor: const Color(0xFF1c2834),
      title: Image.asset(
        'https://pub.dev/static/hash-6pt3begn/img/pub-dev-logo.svg',
        width: 150,
      ),
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(72);
}

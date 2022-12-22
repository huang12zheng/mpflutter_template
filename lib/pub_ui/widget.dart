import 'package:flutter/material.dart';

class ListTile extends StatelessWidget {
  final Widget title;
  final Widget? subtitle;
  final VoidCallback? onTap;

  const ListTile({super.key, required this.title, this.subtitle, this.onTap});
  Widget build(BuildContext context) => GestureDetector(
      onTap: onTap ?? () {},
      child: Column(
        children: [
          title,
          if (subtitle != null) subtitle!,
        ],
      ));
}

#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

import sys

from config.settings import configure_settings_module


def main():
    configure_settings_module()
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

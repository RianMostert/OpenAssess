#!/usr/bin/env python3
"""
OpenAssess Management Script

A cross-platform Python script to manage OpenAssess Docker containers.
Handles starting, stopping, and managing both Traefik and application services.
"""

import argparse
import subprocess
import sys
import os
import time
from pathlib import Path
from typing import List, Optional


class Color:
    """ANSI color codes for terminal output"""

    GREEN = "\033[92m"
    BLUE = "\033[94m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    END = "\033[0m"


def print_header(message: str) -> None:
    """Print a formatted header message"""
    print(f"\n{Color.BOLD}{Color.BLUE}{'=' * 70}{Color.END}")
    print(f"{Color.BOLD}{Color.BLUE}{message}{Color.END}")
    print(f"{Color.BOLD}{Color.BLUE}{'=' * 70}{Color.END}\n")


def print_success(message: str) -> None:
    """Print a success message"""
    print(f"{Color.GREEN}✓ {message}{Color.END}")


def print_error(message: str) -> None:
    """Print an error message"""
    print(f"{Color.RED}✗ {message}{Color.END}", file=sys.stderr)


def print_info(message: str) -> None:
    """Print an info message"""
    print(f"{Color.BLUE}ℹ {message}{Color.END}")


def print_warning(message: str) -> None:
    """Print a warning message"""
    print(f"{Color.YELLOW}⚠ {message}{Color.END}")


def run_command(
    cmd: List[str], check: bool = True, capture_output: bool = False
) -> Optional[subprocess.CompletedProcess]:
    """Run a shell command and handle errors"""
    try:
        if capture_output:
            result = subprocess.run(cmd, check=check, capture_output=True, text=True)
            return result
        else:
            subprocess.run(cmd, check=check)
            return None
    except subprocess.CalledProcessError as e:
        if check:
            print_error(f"Command failed: {' '.join(cmd)}")
            if capture_output and e.stderr:
                print_error(e.stderr)
            sys.exit(1)
        return None
    except FileNotFoundError:
        print_error(f"Command not found: {cmd[0]}")
        print_error("Please ensure Docker and Docker Compose are installed")
        sys.exit(1)


def check_env_file() -> bool:
    """Check if .env file exists"""
    env_file = Path(".env")
    if not env_file.exists():
        print_warning(".env file not found!")
        print_info("For development, copy .env.dev to .env:")
        print(f"  {Color.BOLD}cp .env.dev .env{Color.END}")
        print_info("For production, copy .env.production to .env:")
        print(f"  {Color.BOLD}cp .env.production .env{Color.END}")
        return False
    return True


def ensure_traefik_network() -> None:
    """Ensure the Traefik network exists"""
    print_info("Checking Traefik network...")

    # Check if network exists
    result = run_command(
        [
            "docker",
            "network",
            "ls",
            "--filter",
            "name=^traefik$",
            "--format",
            "{{.Name}}",
        ],
        capture_output=True,
    )

    if result and "traefik" in result.stdout:
        print_success("Traefik network already exists")
    else:
        print_info("Creating Traefik network...")
        run_command(["docker", "network", "create", "traefik"])
        print_success("Traefik network created")


def start_services(with_traefik: bool = True, build: bool = False) -> None:
    """Start all OpenAssess services"""
    print_header("Starting OpenAssess")

    # Check for .env file
    if not check_env_file():
        print_error("Cannot start without .env file")
        sys.exit(1)

    if with_traefik:
        # Ensure network exists
        ensure_traefik_network()

        # Start Traefik
        print_info("Starting Traefik proxy...")
        run_command(
            [
                "docker",
                "compose",
                "-f",
                "docker-compose.traefik.yml",
                "up",
                "-d",
            ]
        )
        print_success("Traefik started")
        time.sleep(2)  # Give Traefik time to initialize

    # Start main application
    print_info("Starting OpenAssess application...")
    cmd = [
        "docker",
        "compose",
        "up",
        "-d",
    ]
    if build:
        cmd.append("--build")
    run_command(cmd)
    print_success("OpenAssess started")

    # Show access information
    print_header("✅ OpenAssess is running!")
    if with_traefik:
        print(f"  {Color.BOLD}App:{Color.END}       http://open-assess.localhost")
        print(f"  {Color.BOLD}API:{Color.END}       http://open-assess.localhost/api")
        print(f"  {Color.BOLD}Dashboard:{Color.END} http://traefik.localhost")
    else:
        print(f"  {Color.BOLD}App:{Color.END}       http://localhost")
        print(f"  {Color.BOLD}API:{Color.END}       http://localhost/api")
    print()


def stop_services(with_traefik: bool = True, remove_volumes: bool = False) -> None:
    """Stop all OpenAssess services"""
    print_header("Stopping OpenAssess")

    # Stop main application
    print_info("Stopping OpenAssess application...")
    cmd = ["docker", "compose", "down"]
    if remove_volumes:
        cmd.append("-v")
        print_warning("This will remove all data volumes!")
    run_command(cmd)
    print_success("OpenAssess stopped")

    if with_traefik:
        # Stop Traefik
        print_info("Stopping Traefik proxy...")
        run_command(["docker", "compose", "-f", "docker-compose.traefik.yml", "down"])
        print_success("Traefik stopped")

    print_header("✅ All services stopped")


def restart_services(with_traefik: bool = True, build: bool = False) -> None:
    """Restart all OpenAssess services"""
    stop_services(with_traefik=with_traefik)
    print()
    start_services(with_traefik=with_traefik, build=build)


def show_logs(follow: bool = True, service: Optional[str] = None) -> None:
    """Show logs from containers"""
    print_header("Container Logs")
    print_info("Press Ctrl+C to exit")
    print()

    try:
        cmd = ["docker", "compose", "logs"]
        if follow:
            cmd.append("-f")
        if service:
            cmd.append(service)

        # Run without check so Ctrl+C doesn't show error
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n")
        print_info("Stopped following logs")


def show_status() -> None:
    """Show status of all containers"""
    print_header("Container Status")

    # Get container status
    run_command(
        [
            "docker",
            "ps",
            "-a",
            "--filter",
            "name=openassess",
            "--format",
            "table {{.Names}}\t{{.Status}}\t{{.Ports}}",
        ]
    )
    print()


def build_image() -> None:
    """Build the OpenAssess Docker image"""
    print_header("Building OpenAssess Image")

    print_info("Building Docker image (this may take a few minutes)...")
    run_command(["docker", "compose", "build", "--no-cache"])
    print_success("Image built successfully")


def pull_image() -> None:
    """Pull the latest OpenAssess image"""
    print_header("Pulling OpenAssess Image")

    print_info("Pulling latest image from registry...")
    run_command(["docker", "compose", "pull", "openassess"])
    print_success("Image pulled successfully")


def show_env_info() -> None:
    """Show environment configuration information"""
    print_header("Environment Configuration")

    env_file = Path(".env")
    if env_file.exists():
        print_success(".env file exists")

        # Read and display non-sensitive variables
        with open(env_file, "r") as f:
            print("\nCurrent configuration:")
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    # Don't show sensitive values
                    key = line.split("=")[0]
                    if any(
                        sensitive in key for sensitive in ["PASSWORD", "SECRET", "KEY"]
                    ):
                        print(f"  {key}=***")
                    else:
                        print(f"  {line}")
    else:
        print_warning(".env file not found")
        print_info("\nAvailable templates:")
        print(f"  {Color.BOLD}.env.dev{Color.END}        - Development configuration")
        print(f"  {Color.BOLD}.env.production{Color.END} - Production template")
    print()


def exec_shell(service: str = "openassess") -> None:
    """Open a shell in the specified container"""
    print_info(f"Opening shell in {service} container...")
    print_info("Type 'exit' to leave the shell")
    print()

    try:
        subprocess.run(["docker", "compose", "exec", service, "/bin/sh"])
    except KeyboardInterrupt:
        print("\n")


def main():
    parser = argparse.ArgumentParser(
        description="OpenAssess Docker Management Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s start              Start all services with Traefik
  %(prog)s start --no-traefik Start without Traefik
  %(prog)s start --build      Rebuild and start services
  %(prog)s stop               Stop all services
  %(prog)s stop --volumes     Stop and remove data volumes
  %(prog)s restart            Restart all services
  %(prog)s logs               Follow logs from all containers
  %(prog)s logs -s openassess View logs from specific service
  %(prog)s status             Show container status
  %(prog)s build              Build the Docker image
  %(prog)s pull               Pull the latest image
  %(prog)s env                Show environment configuration
  %(prog)s shell              Open shell in openassess container
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Start command
    start_parser = subparsers.add_parser("start", help="Start all services")
    start_parser.add_argument(
        "--no-traefik", action="store_true", help="Start without Traefik"
    )
    start_parser.add_argument(
        "--build", action="store_true", help="Rebuild images before starting"
    )

    # Stop command
    stop_parser = subparsers.add_parser("stop", help="Stop all services")
    stop_parser.add_argument(
        "--no-traefik", action="store_true", help="Don't stop Traefik"
    )
    stop_parser.add_argument(
        "--volumes", action="store_true", help="Remove data volumes"
    )

    # Restart command
    restart_parser = subparsers.add_parser("restart", help="Restart all services")
    restart_parser.add_argument(
        "--no-traefik", action="store_true", help="Restart without Traefik"
    )
    restart_parser.add_argument(
        "--build", action="store_true", help="Rebuild images before restarting"
    )

    # Logs command
    logs_parser = subparsers.add_parser("logs", help="Show container logs")
    logs_parser.add_argument(
        "-f",
        "--follow",
        action="store_true",
        default=True,
        help="Follow log output (default)",
    )
    logs_parser.add_argument(
        "--no-follow",
        dest="follow",
        action="store_false",
        help="Don't follow log output",
    )
    logs_parser.add_argument("-s", "--service", help="Show logs for specific service")

    # Status command
    subparsers.add_parser("status", help="Show container status")

    # Build command
    subparsers.add_parser("build", help="Build Docker image")

    # Pull command
    subparsers.add_parser("pull", help="Pull latest image from registry")

    # Env command
    subparsers.add_parser("env", help="Show environment configuration")

    # Shell command
    shell_parser = subparsers.add_parser("shell", help="Open shell in container")
    shell_parser.add_argument(
        "-s",
        "--service",
        default="openassess",
        help="Service to connect to (default: openassess)",
    )

    args = parser.parse_args()

    # Handle commands
    if args.command == "start":
        start_services(with_traefik=not args.no_traefik, build=args.build)
    elif args.command == "stop":
        stop_services(with_traefik=not args.no_traefik, remove_volumes=args.volumes)
    elif args.command == "restart":
        restart_services(with_traefik=not args.no_traefik, build=args.build)
    elif args.command == "logs":
        show_logs(follow=args.follow, service=args.service)
    elif args.command == "status":
        show_status()
    elif args.command == "build":
        build_image()
    elif args.command == "pull":
        pull_image()
    elif args.command == "env":
        show_env_info()
    elif args.command == "shell":
        exec_shell(service=args.service)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n")
        print_info("Operation cancelled")
        sys.exit(0)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)

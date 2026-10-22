"""Compatibilidade com o iniciador antigo; usa o backend Node local autenticado."""
import argparse
import os
import subprocess
from pathlib import Path
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=49317)
args = parser.parse_args()
env = {**os.environ, 'PORT': str(args.port)}
raise SystemExit(subprocess.call(['node', str(Path(__file__).with_name('servir-local.cjs'))], env=env))

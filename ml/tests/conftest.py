import sys
from pathlib import Path

# Las pruebas importan contador_ml desde ml/, sin instalarlo.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

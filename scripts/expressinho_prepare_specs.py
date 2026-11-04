"""Contrato de operacoes permitidas no preparador local; sem comandos arbitrarios."""
import math

def validate_spec(data):
    if not isinstance(data, dict):
        raise ValueError("Pedido deve ser um objeto JSON.")
    operation = data.get("operation")
    if operation == "flatten_bottom":
        if set(data) != {"operation", "cutMm"}:
            raise ValueError("Aparar base requer apenas operation e cutMm.")
        value = data["cutMm"]
        if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or not 0.1 <= value <= 20:
            raise ValueError("Aparar base: remova de 0,1 a 20 mm.")
        return {"operation": operation, "cutMm": float(value)}
    if operation == "decimate":
        if set(data) != {"operation", "targetFaces"}:
            raise ValueError("Simplificar requer apenas operation e targetFaces.")
        value = data["targetFaces"]
        if isinstance(value, bool) or not isinstance(value, int) or not 1000 <= value <= 500000:
            raise ValueError("Escolha de 1.000 a 500.000 faces.")
        return {"operation": operation, "targetFaces": value}
    raise ValueError("Operacao de preparacao nao permitida.")

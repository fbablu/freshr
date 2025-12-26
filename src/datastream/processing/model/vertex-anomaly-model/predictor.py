class Predictor:
    def predict(self, instances):
        results = []
        for inst in instances:
            value = inst.get("current_value")
            mean = inst.get("history_mean")
            std = inst.get("history_std")

            if value is None or mean is None or std in (None, 0):
                results.append({"anomaly": "none"})
                continue

            z = (value - mean) / std
            if z > 2.5:
                results.append({"anomaly": "positive"})
            elif z < -2.5:
                results.append({"anomaly": "negative"})
            else:
                results.append({"anomaly": "none"})
        return results

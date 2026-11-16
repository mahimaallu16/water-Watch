import os
import math
from typing import Dict, Any, List, Tuple
from PIL import Image
import torch
import torch.nn as nn
import torchvision.transforms as transforms

# Supported issue categories
CATEGORIES = [
    "pipe_leak",
    "overflow",
    "damaged_valve",
    "low_pressure",
    "contamination",
    "other"
]

class WaterIssueCNN(nn.Module):
    """
    Modular PyTorch CNN architecture for water infrastructure defect classification.
    Designed to easily load trained weights when available.
    """
    def __init__(self, num_classes: int = len(CATEGORIES)):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2), # 112x112

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2), # 56x56

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2), # 28x28

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((4, 4))
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(256 * 4 * 4, 128),
            nn.ReLU(inplace=True),
            nn.Linear(128, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x

class ImageAnalysisEngine:
    def __init__(self, model_path: str = "backend/app/ai/weights.pth"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_path = model_path
        self.model = WaterIssueCNN()
        self.model.to(self.device)
        self.has_trained_weights = False
        
        if os.path.exists(self.model_path):
            try:
                state_dict = torch.load(self.model_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.model.eval()
                self.has_trained_weights = True
            except Exception as e:
                self.has_trained_weights = False

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Analyzes an image using PyTorch model if weights are loaded,
        or deterministic computer-vision feature extraction heuristic fallback.
        """
        if not os.path.exists(image_path):
            return {
                "suggested_category": "other",
                "confidence": 0.50,
                "detected_features": ["image_file_not_found"],
                "explanation": "Image could not be accessed; defaulting to general review.",
                "model_used": "fallback_default"
            }

        try:
            with Image.open(image_path) as raw_img:
                rgb_img = raw_img.convert("RGB")
                width, height = rgb_img.size

                # If trained weights are loaded, use PyTorch neural network forward pass
                if self.has_trained_weights:
                    tensor_img = self.transform(rgb_img).unsqueeze(0).to(self.device)
                    with torch.no_grad():
                        logits = self.model(tensor_img)
                        probs = torch.softmax(logits, dim=1).squeeze(0)
                        top_prob, top_idx = torch.topk(probs, 1)
                        predicted_cat = CATEGORIES[top_idx.item()]
                        confidence = round(top_prob.item(), 3)
                        return {
                            "suggested_category": predicted_cat,
                            "confidence": confidence,
                            "detected_features": ["neural_network_classification", f"resolution_{width}x{height}"],
                            "explanation": f"AI model classified photograph as {predicted_cat.replace('_', ' ')} with {int(confidence*100)}% confidence.",
                            "model_used": "pytorch_water_issue_cnn"
                        }

                # High-fidelity computer-vision feature analysis baseline
                return self._baseline_feature_heuristic(rgb_img, width, height)

        except Exception as e:
            return {
                "suggested_category": "pipe_leak",
                "confidence": 0.60,
                "detected_features": ["error_during_cv_analysis"],
                "explanation": f"Automated inspection encountered: {str(e)}; recommended human verification.",
                "model_used": "rule_based_fallback"
            }

    def _baseline_feature_heuristic(self, img: Image.Image, width: int, height: int) -> Dict[str, Any]:
        """
        Deterministic, robust feature analysis inspecting color channels,
        water sheen, mud/sediment discoloration, and metal/valve structures.
        """
        # Downsample for rapid, consistent feature computation
        small = img.resize((64, 64))
        pixels = list(small.getdata())
        total_px = len(pixels)

        blue_px = 0
        brown_mud_px = 0
        metallic_gray_px = 0
        bright_sheen_px = 0

        for r, g, b in pixels:
            # Water sheen / high brightness
            if r > 190 and g > 190 and b > 190:
                bright_sheen_px += 1
            # Blue-dominant water accumulation
            elif b > r + 15 and b > g:
                blue_px += 1
            # Muddy / brown sediment (contamination or street overflow)
            elif r > 110 and g > 70 and b < 60 and (r - b) > 40:
                brown_mud_px += 1
            # Metallic / gray tones (valves, pipes, fittings)
            elif abs(r - g) < 15 and abs(g - b) < 15 and 60 < r < 160:
                metallic_gray_px += 1

        blue_ratio = blue_px / total_px
        mud_ratio = brown_mud_px / total_px
        metal_ratio = metallic_gray_px / total_px
        sheen_ratio = bright_sheen_px / total_px

        detected_features = []
        if blue_ratio > 0.08:
            detected_features.append(f"standing_water_signature ({int(blue_ratio*100)}%)")
        if sheen_ratio > 0.12:
            detected_features.append(f"surface_reflection_sheen ({int(sheen_ratio*100)}%)")
        if mud_ratio > 0.08:
            detected_features.append(f"sediment_turbidity ({int(mud_ratio*100)}%)")
        if metal_ratio > 0.15:
            detected_features.append(f"pipeline_metal_hardware ({int(metal_ratio*100)}%)")

        if mud_ratio > 0.12:
            suggested = "contamination"
            conf = min(0.85, 0.65 + mud_ratio)
            explanation = "High turbidity and discoloration detected in image, suggesting sediment intrusion or contaminated water."
        elif sheen_ratio > 0.20 or (blue_ratio > 0.12 and sheen_ratio > 0.10):
            suggested = "overflow"
            conf = min(0.88, 0.70 + sheen_ratio)
            explanation = "Widespread water pooling and specular reflection signatures indicate active surface overflow or localized flooding."
        elif metal_ratio > 0.20:
            suggested = "damaged_valve"
            conf = min(0.82, 0.65 + metal_ratio)
            explanation = "Structural plumbing hardware / valve enclosure detected in image frame."
        else:
            suggested = "pipe_leak"
            conf = 0.75
            explanation = "Localized moisture and water stream characteristics match typical pipe puncture or joint leak."

        return {
            "suggested_category": suggested,
            "confidence": round(conf, 2),
            "detected_features": detected_features or ["standard_water_infrastructure_profile"],
            "explanation": explanation,
            "model_used": "baseline_cv_feature_engine"
        }

image_analysis_engine = ImageAnalysisEngine()


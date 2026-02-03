"""
Computer Vision Core Module
Handles chessboard detection and perspective transformation.
- Finds board corners in images
- Calculates homography matrix for perspective correction
- Maps image points to chess grid coordinates
"""

import cv2
import numpy as np
from backend.config import VisionConfig


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Sort 4 corner points in clockwise order starting from top-left.
    
    Args:
        pts: Array of 4 points (x, y coordinates)
        
    Returns:
        np.ndarray: Ordered points [TL, TR, BR, BL]
        
    Algorithm:
        - Top-Left: Minimum sum of x+y
        - Bottom-Right: Maximum sum of x+y
        - Top-Right: Minimum difference of y-x
        - Bottom-Left: Maximum difference of y-x
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # Top-Left
    rect[2] = pts[np.argmax(s)]  # Bottom-Right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # Top-Right
    rect[3] = pts[np.argmax(diff)]  # Bottom-Left
    return rect


def find_board_corners(image: np.ndarray) -> np.ndarray:
    """
    Detect chessboard corners using adaptive thresholding and contour detection.
    Optimized for finding quadrilaterals (trapezoids) in 3D perspective images.
    
    Args:
        image: Input BGR image
        
    Returns:
        np.ndarray: 4 corner points if found, None otherwise
        
    Algorithm Steps:
        1. Convert to grayscale
        2. Apply Gaussian blur to reduce noise
        3. Adaptive threshold to handle uneven lighting
        4. Morphological dilation to connect broken edges
        5. Find and approximate contours
        6. Select largest quadrilateral that occupies >20% of image
        
    Parameters:
        - Blur kernel: 7x7
        - Adaptive block size: 21
        - Dilation iterations: 1
        - Min board area: 20% of image
    """
    # Step 1: Preprocessing (Grayscale → Blur → Adaptive Threshold)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Smooth image to reduce noise from squares and pieces
    blur = cv2.GaussianBlur(
        gray, 
        VisionConfig.GAUSSIAN_BLUR_KERNEL, 
        VisionConfig.GAUSSIAN_BLUR_SIGMA
    )
    
    # Adaptive threshold handles uneven lighting
    # Large block size (21) captures board edges rather than individual squares
    thresh = cv2.adaptiveThreshold(
        blur, 
        255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 
        VisionConfig.ADAPTIVE_BLOCK_SIZE, 
        VisionConfig.ADAPTIVE_C_CONSTANT
    )

    # Dilation connects broken edges caused by pieces
    kernel = np.ones(VisionConfig.DILATION_KERNEL_SIZE, np.uint8)
    thresh = cv2.dilate(
        thresh, 
        kernel, 
        iterations=VisionConfig.DILATION_ITERATIONS
    )

    # Step 2: Find contours
    contours, _ = cv2.findContours(
        thresh, 
        cv2.RETR_EXTERNAL, 
        cv2.CHAIN_APPROX_SIMPLE
    )

    # Sort by area and check top candidates
    contours = sorted(
        contours, 
        key=cv2.contourArea, 
        reverse=True
    )[:VisionConfig.MAX_CONTOURS_TO_CHECK]

    img_area = image.shape[0] * image.shape[1]
    
    # Step 3: Find quadrilateral that represents the board
    for c in contours:
        # Calculate perimeter for polygon approximation
        peri = cv2.arcLength(c, True)
        
        # Try multiple epsilon values for approximation
        for eps_factor in VisionConfig.EPSILON_FACTORS:
            approx = cv2.approxPolyDP(c, eps_factor * peri, True)

            # Check if we found a quadrilateral with sufficient area
            if len(approx) == VisionConfig.REQUIRED_CORNERS:
                area = cv2.contourArea(approx)
                area_ratio = area / img_area
                
                if area_ratio > VisionConfig.MIN_BOARD_AREA_RATIO:
                    print(VisionConfig.MSG_BOARD_FOUND.format(ratio=area_ratio))
                    return approx.reshape(4, 2)

    print(VisionConfig.MSG_BOARD_NOT_FOUND)
    return None


def get_board_mapping_matrix(
    corners: np.ndarray, 
    img_w: int, 
    img_h: int
) -> tuple:
    """
    Calculate perspective transformation matrix from skewed to flat view.
    
    Args:
        corners: 4 corner points of the board in original image
        img_w: Image width (unused, kept for API compatibility)
        img_h: Image height (unused, kept for API compatibility)
        
    Returns:
        tuple: (transformation_matrix, board_side_length)
        
    Process:
        1. Order corners (TL, TR, BR, BL)
        2. Calculate maximum width and height
        3. Use larger dimension for square output
        4. Compute homography matrix for perspective transform
        
    Note:
        Output is always square to preserve chess board proportions
    """
    rect = order_points(corners)

    # Calculate dimensions of the warped board
    (tl, tr, br, bl) = rect
    
    # Width: distance between bottom corners and top corners
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    # Height: distance between right corners and left corners
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    # Use square output (larger dimension)
    side = max(maxWidth, maxHeight)

    # Destination points for top-down view (square)
    dst = np.array([
        [0, 0],
        [side - 1, 0],
        [side - 1, side - 1],
        [0, side - 1]
    ], dtype="float32")

    # Calculate perspective transformation matrix
    M = cv2.getPerspectiveTransform(rect, dst)
    return M, side


def map_point_to_grid(
    x: float, 
    y: float, 
    M: np.ndarray, 
    side_len: int
) -> tuple:
    """
    Map a point from original image to chess grid coordinates.
    
    Args:
        x: X coordinate in original image
        y: Y coordinate in original image
        M: Perspective transformation matrix
        side_len: Side length of the warped square board
        
    Returns:
        tuple: (row, col) in chess grid (0-7, 0-7)
        
    Process:
        1. Apply perspective transformation to point
        2. Divide by square size to get grid position
        3. Clamp to valid range [0, 7]
        
    Example:
        >>> map_point_to_grid(100, 150, M, 800)
        (1, 2)  # Row 1, Column 2 (b7 in chess notation)
    """
    # Transform point using homography matrix
    point_vector = np.array([[[x, y]]], dtype='float32')
    transformed_point = cv2.perspectiveTransform(point_vector, M)[0][0]

    tx, ty = transformed_point

    # Calculate grid position
    sq_size = side_len / VisionConfig.CHESS_GRID_SIZE

    col = int(tx // sq_size)
    row = int(ty // sq_size)

    # Clamp to valid chess grid range
    row = max(VisionConfig.MIN_GRID_INDEX, min(VisionConfig.MAX_GRID_INDEX, row))
    col = max(VisionConfig.MIN_GRID_INDEX, min(VisionConfig.MAX_GRID_INDEX, col))

    return row, col


def is_quad_too_distorted(
    pts: np.ndarray, 
    angle_tolerance: int = VisionConfig.ANGLE_TOLERANCE_DEGREES
) -> bool:
    """
    Check if quadrilateral is too distorted compared to a rectangle.
    Used for 2D/screenshot images to avoid warped grid lines.
    
    Args:
        pts: 4 corner points
        angle_tolerance: Maximum deviation from 90° (default: 15°)
        
    Returns:
        bool: True if any corner angle deviates >15° from 90°
        
    Algorithm:
        1. Order points
        2. Calculate angle at each corner
        3. Check if all angles are within tolerance of 90°
        
    Use Case:
        Reject detections where board is too skewed for accurate
        piece recognition in 2D screenshots.
    """
    if pts is None or len(pts) != VisionConfig.REQUIRED_CORNERS:
        return True
    
    rect = order_points(pts)
    
    def get_angle(p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
        """Calculate angle at p2 formed by p1-p2-p3"""
        v1 = p1 - p2
        v2 = p3 - p2
        cos_theta = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
        angle = np.degrees(np.arccos(np.clip(cos_theta, -1.0, 1.0)))
        return angle

    # Calculate all 4 corner angles
    angles = [
        get_angle(rect[3], rect[0], rect[1]),  # Top-Left
        get_angle(rect[0], rect[1], rect[2]),  # Top-Right
        get_angle(rect[1], rect[2], rect[3]),  # Bottom-Right
        get_angle(rect[2], rect[3], rect[0])   # Bottom-Left
    ]
    
    # Check if any angle deviates too much from 90°
    for angle in angles:
        if abs(angle - VisionConfig.RIGHT_ANGLE_DEGREES) > angle_tolerance:
            return True  # Too distorted
            
    return False  # All angles are acceptable

import numpy as np
import cv2
import urllib.request
import sys

def laplacian_var(url):
  response = urllib.request.urlopen(url)
  img_array = np.array(bytearray(response.read()), dtype=np.uint8)
  img = cv2.imdecode(img_array, -1)


  gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
  laplacian = cv2.Laplacian(gray, cv2.CV_64F).var()
  print(laplacian)
  cv2.waitKey(0)

laplacian_var(sys.argv[1])
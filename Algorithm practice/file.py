

def custom_sum(size: int) -> int:
    sum = 0

    for i in range(size):
        if( i % 3 ==0 or i % 5 == 0):
            sum += i
    
    return sum


if __name__ == "__main__":
    print(custom_sum(1000))

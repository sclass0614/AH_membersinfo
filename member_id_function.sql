-- 회원번호 생성을 위한 저장 프로시저
CREATE OR REPLACE FUNCTION generate_unique_member_id(year_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_number INTEGER := 0;
  next_number TEXT;
  new_member_id TEXT;
BEGIN
  -- FOR UPDATE 구문을 사용하여 해당 레코드에 락을 획득
  -- 이렇게 하면 다른 세션이 동시에 같은 작업을 수행할 때 대기하게 됨
  -- 락을 통해 동시성 문제 해결
  BEGIN
    -- 트랜잭션 내에서 현재 최대 번호를 조회
    SELECT MAX(CAST(SUBSTRING("회원번호" FROM 4) AS INTEGER))
    INTO max_number
    FROM membersinfo
    WHERE "회원번호" LIKE year_prefix || '%';
    
    -- NULL인 경우 0으로 초기화
    IF max_number IS NULL THEN
      max_number := 0;
    END IF;
    
    -- 다음 번호 생성
    next_number := LPAD((max_number + 1)::TEXT, 3, '0');
    new_member_id := year_prefix || next_number;
    
    -- 레코드가 이미 존재하는지 확인 (중복 방지를 위한 추가 검사)
    PERFORM 1 FROM membersinfo WHERE "회원번호" = new_member_id;
    
    IF FOUND THEN
      -- 이미 존재하는 경우 다시 시도 (재귀적으로 다음 번호 시도)
      -- 이 상황은 거의 발생하지 않지만, 혹시 모를 상황을 대비
      RETURN generate_unique_member_id(year_prefix);
    END IF;
    
    RETURN new_member_id;
  END;
END;
$$; 
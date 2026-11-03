describe('student branch API requests', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('does not short-circuit student branch lookup when a student token is present', async () => {
    localStorage.setItem('token', 'student-1RV21CS001');

    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: 7, branchName: 'student-1rv21cs001' }),
    });

    const { getMyBranch } = require('./api');

    const result = await getMyBranch(12, '1RV21CS001');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/github/workflow/my-branch/12/1RV21CS001',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(result).toEqual({ id: 7, branchName: 'student-1rv21cs001' });
  });
});
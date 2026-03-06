"""Agent script for machine performance prediction tasks.

Uses the project's agent pattern with the standard OpenAI API.
Environment variable required: OPENAI_API_KEY
"""

import json
import os

from openai import OpenAI

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise EnvironmentError("OPENAI_API_KEY environment variable is not set")

client = OpenAI(api_key=api_key)

USER_QUERY = """
数据文件：/storage/workspace/CS-32-80数据样本.xlsx

任务：用零件参数预测整机性能，分别预测传动误差、定位精度、重复定位精度。

重点分析：
1. 工艺参数（槽中 0.935±0.010、槽底 ≤0.880、磨削后单边壁厚 1.470±0.010）对性能指标的影响
2. 各零件参数之间的相关性
3. 建立预测模型并给出改进建议
"""

# ---------------------------------------------------------------------------
# Tool definitions (function-calling schema)
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_excel_data",
            "description": "读取Excel文件，返回数据概要（列名、行数、前几行预览及基本统计信息）",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Excel文件的完整路径",
                    }
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_correlations",
            "description": "计算零件参数列与目标性能列之间的Pearson相关系数，并返回排序结果",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Excel文件的完整路径",
                    },
                    "target_columns": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "需要分析的目标列名列表，例如 [\"传动误差\", \"定位精度\", \"重复定位精度\"]",
                    },
                },
                "required": ["file_path", "target_columns"],
            },
        },
    },
]

# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------


def read_excel_data(file_path: str) -> str:
    """Return a textual summary of an Excel file."""
    try:
        import pandas as pd
    except ImportError:
        return "错误：pandas 未安装，请重新安装项目依赖（uv sync 或 pip install -e .）。"

    try:
        df = pd.read_excel(file_path, engine="openpyxl")
    except FileNotFoundError:
        return f"错误：文件 '{file_path}' 不存在。"
    except Exception as exc:
        return f"错误：读取文件时发生异常 — {exc}"

    lines = [
        f"文件：{file_path}",
        f"行数：{len(df)}，列数：{len(df.columns)}",
        f"列名：{list(df.columns)}",
        "",
        "前5行预览：",
        df.head().to_string(),
        "",
        "基本统计信息：",
        df.describe().to_string(),
    ]
    return "\n".join(lines)


def analyze_correlations(file_path: str, target_columns: list) -> str:
    """Return correlation coefficients between all columns and each target column."""
    try:
        import pandas as pd
    except ImportError:
        return "错误：pandas 未安装，请重新安装项目依赖（uv sync 或 pip install -e .）。"

    try:
        df = pd.read_excel(file_path, engine="openpyxl")
    except FileNotFoundError:
        return f"错误：文件 '{file_path}' 不存在。"
    except Exception as exc:
        return f"错误：读取文件时发生异常 — {exc}"

    numeric_df = df.select_dtypes(include="number")
    result_parts = ["相关性分析结果："]
    for target in target_columns:
        if target not in numeric_df.columns:
            result_parts.append(f"\n⚠️  列 '{target}' 不存在或非数值类型，已跳过。")
            continue
        corr = numeric_df.corr()[target].drop(labels=[target]).sort_values(
            key=lambda s: s.abs(), ascending=False
        )
        result_parts.append(f"\n【{target}】的相关系数（按绝对值排序）：")
        result_parts.append(corr.to_string())
    return "\n".join(result_parts)


# ---------------------------------------------------------------------------
# Tool dispatcher
# ---------------------------------------------------------------------------


def _dispatch_tool(name: str, arguments: dict) -> str:
    if name == "read_excel_data":
        return read_excel_data(arguments["file_path"])
    if name == "analyze_correlations":
        return analyze_correlations(
            arguments["file_path"],
            arguments.get("target_columns", []),
        )
    return f"未知工具：{name}"


# ---------------------------------------------------------------------------
# Agent loop
# ---------------------------------------------------------------------------


def run_agent(query: str, model: str = "gpt-4o") -> str:
    """Run the agentic loop and return the final answer."""
    print("🤖 Agent 开始处理任务…\n")
    print(f"📝 用户查询：\n{query.strip()}\n")
    print("-" * 60)

    messages = [
        {
            "role": "system",
            "content": (
                "你是一名专业的机械性能预测分析师。"
                "你擅长读取 Excel 数据、分析零件工艺参数与整机性能指标（传动误差、"
                "定位精度、重复定位精度）之间的关系，并给出预测模型与改进建议。"
                "请使用中文回答，分析结论要具体、有数据支撑。"
            ),
        },
        {"role": "user", "content": query},
    ]

    while True:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )

        msg = response.choices[0].message
        # Append as a plain dict so the list stays JSON-serialisable
        messages.append(msg.model_dump(exclude_unset=True))

        if not msg.tool_calls:
            # No more tool calls — final answer ready
            final_answer = msg.content or ""
            print("\n✅ Agent 分析完成：\n")
            print(final_answer)
            return final_answer

        # Execute every requested tool call
        for tool_call in msg.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)

            print(f"\n🔧 调用工具：{fn_name}")
            print(f"   参数：{json.dumps(fn_args, ensure_ascii=False)}")

            tool_result = _dispatch_tool(fn_name, fn_args)
            preview = tool_result[:300] + "…" if len(tool_result) > 300 else tool_result
            print(f"   结果预览：{preview}")

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_result,
                }
            )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    run_agent(USER_QUERY)
